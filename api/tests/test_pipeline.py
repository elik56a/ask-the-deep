import itertools
from collections.abc import AsyncIterator

from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import AgentInfo, DeltaToolCalls, FunctionModel

from app.agent.chat_agent import PastMessage, agent
from app.config import Settings
from app.events import StreamEvent
from app.pipeline import run_pipeline
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, Turn, fake_github, make_chunk, scripted

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
    within_rate_limit: bool = True,
) -> list[StreamEvent]:
    with agent.override(model=model or scripted(SEARCH, ANSWER)):
        return [
            e
            async for e in run_pipeline(
                question, SETTINGS, retriever, fake_github(), history, within_rate_limit
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
    assert types[:7] == [
        "request.started",
        "guardrails.checked",
        "tool.called",
        "retrieval.started",
        "retrieval.completed",
        "tool.completed",
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
    events = await _run("Where?", within_rate_limit=False)
    _assert_well_formed(events)
    error = events[2].event.model_dump()
    assert error["code"] == "rate_limited"
    assert "tool.called" not in _types(events)
    assert events[-1].event.model_dump()["outcome"] == "blocked"
