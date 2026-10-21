import json
from collections.abc import AsyncIterator

from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import (
    ModelMessage,
    ModelResponse,
    TextPart,
    UserPromptPart,
)
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.function import (
    AgentInfo,
    DeltaToolCall,
    DeltaToolCalls,
    FunctionModel,
)
from pydantic_ai.usage import RequestUsage

from app.agent.chat_agent import (
    AgentFinished,
    AgentStep,
    PastMessage,
    agent,
    cost_usd,
    run_agent,
)
from app.config import Settings
from app.events import LlmCompleted, TextDelta, ToolCompleted
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, Turn, make_chunk, make_deps, scripted

THRESHOLD = Settings().retrieval_threshold
RETRIEVER = StubRetriever(
    [Hit(make_chunk("work", "Eliyahu works at Phytech"), THRESHOLD + 0.2, 0.03)]
)
SEARCH: Turn = ("search_knowledge", {"query": "work"})
VALID: Turn = (
    "answer",
    {"kind": "answered", "citations": ["work"], "text": "He works at Phytech."},
)
FORGED: Turn = (
    "answer",
    {"kind": "answered", "citations": ["made-up"], "text": "He runs NASA."},
)


async def _run(*turns: Turn, question: str = "Where?") -> list[AgentStep]:
    with agent.override(model=scripted(*turns)):
        return [s async for s in run_agent(question, make_deps(RETRIEVER), [])]


def _finished(steps: list[AgentStep]) -> AgentFinished:
    assert isinstance(steps[-1], AgentFinished)
    return steps[-1]


def _text(steps: list[AgentStep]) -> str:
    return "".join(s.text for s in steps if isinstance(s, TextDelta))


def _types(steps: list[AgentStep]) -> list[str]:
    return [s.type for s in steps if not isinstance(s, AgentFinished)]


async def test_searches_then_answers_with_citations() -> None:
    steps = await _run(SEARCH, VALID)
    assert _types(steps) == [
        "llm.started",
        "llm.completed",
        "tool.called",
        "retrieval.started",
        "retrieval.completed",
        "tool.completed",
        "llm.started",
        "generation.started",
        "text.delta",
        "llm.completed",
    ]
    assert _text(steps) == "He works at Phytech."
    answer = _finished(steps).answer
    assert answer is not None
    assert answer.citations == ["work"]


async def test_forged_citation_is_retried_and_never_shown() -> None:
    steps = await _run(SEARCH, FORGED, VALID)
    assert _text(steps) == "He works at Phytech."
    assert _finished(steps).usage.requests == 3


async def test_gives_up_after_one_failed_retry() -> None:
    steps = await _run(SEARCH, FORGED)
    assert _text(steps) == ""
    assert _finished(steps).answer is None


async def test_answer_without_any_tool_result_is_rejected() -> None:
    uncited: Turn = ("answer", {**VALID[1], "citations": []})
    steps = await _run(uncited)
    assert _finished(steps).answer is None


async def test_smalltalk_needs_no_tools() -> None:
    hello: Turn = ("answer", {"kind": "smalltalk", "citations": [], "text": "Hi!"})
    steps = await _run(hello)
    assert _text(steps) == "Hi!"
    answer = _finished(steps).answer
    assert answer is not None
    assert answer.kind == "smalltalk"


async def test_stops_a_model_that_keeps_calling_tools() -> None:
    steps = await _run(SEARCH)
    tool_calls = [s for s in steps if isinstance(s, ToolCompleted)]
    assert len(tool_calls) <= Settings().agent_max_tool_calls
    assert _finished(steps).answer is None


async def test_the_last_allowed_call_can_only_answer() -> None:
    offered: list[list[str]] = []

    async def searcher(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaToolCalls]:
        offered.append([t.name for t in info.function_tools])
        name, args = SEARCH if info.function_tools else VALID
        if name == "answer":
            name = info.output_tools[0].name
        yield {0: DeltaToolCall(name=name, json_args=json.dumps(args))}

    with agent.override(model=FunctionModel(stream_function=searcher)):
        steps = [s async for s in run_agent("Where?", make_deps(RETRIEVER), [])]

    max_requests = Settings().agent_max_requests
    assert len(offered) == max_requests
    assert all(offered[: max_requests - 1])
    assert offered[-1] == []
    answer = _finished(steps).answer
    assert answer is not None
    assert answer.citations == ["work"]


async def test_backup_model_answers_when_the_main_one_fails() -> None:
    async def down(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaToolCalls]:
        raise ModelHTTPError(503, "primary")
        yield {}

    backup = FallbackModel(FunctionModel(stream_function=down), scripted(SEARCH, VALID))
    with agent.override(model=backup):
        steps = [s async for s in run_agent("Where?", make_deps(RETRIEVER), [])]
    assert _text(steps) == "He works at Phytech."


def test_cost_uses_list_prices_and_treats_unknown_models_as_free() -> None:
    usage = RequestUsage(input_tokens=1_000_000, output_tokens=0)
    priced = ModelResponse(
        parts=[TextPart("x")],
        usage=usage,
        model_name="gemini-2.5-flash-lite",
        provider_name="google",
    )
    unknown = ModelResponse(parts=[TextPart("x")], usage=usage, model_name="test")
    assert cost_usd([priced]) > 0
    assert cost_usd([priced, unknown]) == cost_usd([priced])


async def test_model_sees_earlier_messages_for_follow_ups() -> None:
    sent: list[ModelMessage] = []
    history = [
        PastMessage(role="user", text="Where does Eliyahu work?"),
        PastMessage(role="assistant", text="At Phytech."),
    ]
    with agent.override(model=scripted(VALID, record=sent)):
        steps = [
            s
            async for s in run_agent(
                "What does he do there?", make_deps(RETRIEVER), history
            )
        ]
    contents = [
        str(part.content)
        for m in sent
        for part in m.parts
        if isinstance(part, UserPromptPart | TextPart)
    ]
    assert contents[:3] == [
        "Where does Eliyahu work?",
        "At Phytech.",
        "What does he do there?",
    ]
    assert _finished(steps).cost_usd == 0.0


async def test_each_model_call_reports_its_decision_and_rejections() -> None:
    steps = await _run(SEARCH, FORGED, VALID)
    calls = [s for s in steps if isinstance(s, LlmCompleted)]
    assert [(c.call, c.decision, c.tools) for c in calls] == [
        (1, "tools", ["search_knowledge"]),
        (2, "answer", []),
        (3, "answer", []),
    ]
    assert calls[1].rejected is not None
    assert "made-up" in calls[1].rejected
    assert calls[2].rejected is None
    assert all(c.input_tokens > 0 and not c.fallback for c in calls)
