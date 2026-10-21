import asyncio
import itertools
from collections.abc import AsyncIterator

from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import AgentInfo, DeltaToolCalls, FunctionModel

from app.agent.chat_agent import PastMessage, agent
from app.config import Settings
from app.events import StreamEvent
from app.pipeline import Services, run_pipeline
from app.rag.retrieval import Hit
from tests.fakes import (
    FakeBudget,
    FakeLimiter,
    FakeStats,
    StubRetriever,
    Turn,
    make_chunk,
    make_services,
    scripted,
)

SETTINGS = Settings()
THRESHOLD = SETTINGS.retrieval_threshold
RELEVANT = StubRetriever(
    [Hit(make_chunk("work", "Eliyahu works at Phytech"), THRESHOLD + 0.2, 0.03)]
)
IRRELEVANT = StubRetriever(
    [Hit(make_chunk("work", "Eliyahu works at Phytech"), THRESHOLD - 0.2, 0.03)]
)
SEARCH: Turn = ("search_knowledge", {"query": "work"})
ANSWER: Turn = (
    "answer",
    {"kind": "answered", "citations": ["work"], "text": "He works at Phytech."},
)


async def _run(
    question: str,
    retriever: StubRetriever = RELEVANT,
    model: FunctionModel | None = None,
    history: list[PastMessage] | None = None,
    services: Services | None = None,
    session_id: str | None = "session-1",
) -> list[StreamEvent]:
    services = services or make_services(retriever)
    with agent.override(model=model or scripted(SEARCH, ANSWER)):
        return [
            e
            async for e in run_pipeline(
                question, SETTINGS, services, "visitor", session_id, history
            )
        ]


def _types(events: list[StreamEvent]) -> list[str]:
    return [e.event.type for e in events]


def _assert_well_formed(events: list[StreamEvent]) -> None:
    assert [e.seq for e in events] == list(range(len(events)))
    assert len({e.request_id for e in events}) == 1
    assert all(a.t_ms <= b.t_ms for a, b in itertools.pairwise(events))
    for e in events:
        assert StreamEvent.model_validate_json(e.model_dump_json()) == e


async def test_agent_answer_emits_every_stage_in_order() -> None:
    events = await _run("Where does Eliyahu work?")
    _assert_well_formed(events)
    types = _types(events)
    assert types[:10] == [
        "request.started",
        "guardrails.checked",
        "llm.started",
        "llm.completed",
        "tool.called",
        "retrieval.started",
        "retrieval.completed",
        "tool.completed",
        "llm.started",
        "generation.started",
    ]
    assert "text.delta" in types
    assert types[-4:] == [
        "decision.made",
        "citations.attached",
        "usage.reported",
        "request.finished",
    ]
    assert events[-1].event.model_dump()["outcome"] == "answered"


async def test_attaches_only_the_cited_passages() -> None:
    events = await _run("Where does Eliyahu work?")
    cited = next(
        e.event.model_dump() for e in events if e.event.type == "citations.attached"
    )
    assert [c["chunk_id"] for c in cited["citations"]] == ["work"]


async def test_no_valid_answer_becomes_no_information_in_question_language() -> None:
    events = await _run("איפה אליהו עובד?", IRRELEVANT)
    _assert_well_formed(events)
    delta = next(e.event.model_dump() for e in events if e.event.type == "text.delta")
    assert "אין לי" in delta["text"]
    assert "citations.attached" not in _types(events)
    assert events[-1].event.model_dump()["outcome"] == "no_information"


async def test_blocks_input_over_the_length_cap() -> None:
    events = await _run("x" * (SETTINGS.max_input_chars + 1))
    _assert_well_formed(events)
    assert _types(events) == [
        "request.started",
        "guardrails.checked",
        "error",
        "request.finished",
    ]


async def test_model_failure_emits_a_public_error() -> None:
    async def broken(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaToolCalls]:
        raise RuntimeError("provider down")
        yield {}

    events = await _run("Where?", model=FunctionModel(stream_function=broken))
    _assert_well_formed(events)
    assert _types(events)[-2:] == ["error", "request.finished"]
    assert events[-1].event.model_dump()["outcome"] == "error"


async def test_blocks_a_conversation_history_over_the_cap() -> None:
    history = [PastMessage(role="user", text="hi")] * (
        SETTINGS.max_history_messages + 1
    )
    events = await _run("Where?", history=history)
    checks = events[1].event.model_dump()["checks"]
    assert {"name": "history_size", "passed": False} in checks
    assert events[-1].event.model_dump()["outcome"] == "blocked"


async def test_rate_limited_visitor_is_blocked_before_the_agent() -> None:
    limited = make_services(RELEVANT, limiter=FakeLimiter(allow=False))
    events = await _run("Where?", services=limited)
    _assert_well_formed(events)
    error = events[2].event.model_dump()
    assert error["code"] == "rate_limited"
    assert "tool.called" not in _types(events)
    assert events[-1].event.model_dump()["outcome"] == "blocked"


async def test_over_budget_is_blocked_before_the_agent() -> None:
    events = await _run("Where?", services=make_services(RELEVANT, FakeBudget(False)))
    assert events[2].event.model_dump()["code"] == "budget_exhausted"
    assert "tool.called" not in _types(events)
    assert events[-1].event.model_dump()["outcome"] == "blocked"


async def test_records_what_each_answer_cost() -> None:
    budget = FakeBudget()
    events = await _run("Where?", services=make_services(RELEVANT, budget))
    usage = next(
        e.event.model_dump() for e in events if e.event.type == "usage.reported"
    )
    assert budget.spent == [("visitor", usage["cost_usd"])]


async def test_records_each_finished_question_in_the_stats() -> None:
    stats = FakeStats()
    events = await _run("Where?", services=make_services(RELEVANT, stats=stats))
    usage = next(
        e.event.model_dump() for e in events if e.event.type == "usage.reported"
    )
    assert stats.recorded == [(False, usage["cost_usd"])]


async def test_blocked_questions_are_not_counted() -> None:
    stats = FakeStats()
    await _run(
        "Where?", services=make_services(RELEVANT, FakeBudget(False), stats=stats)
    )
    assert stats.recorded == []


async def test_visitor_without_a_session_must_pass_the_human_check() -> None:
    events = await _run("Where?", session_id=None)
    assert events[2].event.model_dump()["code"] == "human_check_required"
    assert "tool.called" not in _types(events)


async def test_each_session_has_its_own_rate_limit() -> None:
    per_session = make_services(
        RELEVANT, limiter=FakeLimiter(allow=True, block_prefix="session-")
    )
    events = await _run("Where?", services=per_session)
    assert events[2].event.model_dump()["code"] == "rate_limited"


async def test_a_hanging_model_hits_the_deadline_with_a_clear_message() -> None:
    async def hangs(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaToolCalls]:
        await asyncio.sleep(30)
        yield {}

    quick = SETTINGS.model_copy(update={"request_timeout_s": 0.2})
    with agent.override(model=FunctionModel(stream_function=hangs)):
        events = [
            e
            async for e in run_pipeline(
                "Where?", quick, make_services(RELEVANT), "visitor", "session-1"
            )
        ]
    _assert_well_formed(events)
    assert events[-2].event.model_dump()["code"] == "timeout"
    assert events[-1].event.model_dump()["outcome"] == "error"
