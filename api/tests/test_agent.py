import json
from collections.abc import AsyncIterator

from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import (
    ModelMessage,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
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


FIRST_SEARCH = [
    "tool.called",
    "retrieval.started",
    "retrieval.completed",
    "tool.completed",
]


async def _run(
    *turns: Turn, question: str = "Where?", retriever: StubRetriever = RETRIEVER
) -> list[AgentStep]:
    with agent.override(model=scripted(*turns)):
        return [s async for s in run_agent(question, make_deps(retriever), [])]


def _finished(steps: list[AgentStep]) -> AgentFinished:
    assert isinstance(steps[-1], AgentFinished)
    return steps[-1]


def _text(steps: list[AgentStep]) -> str:
    return "".join(s.text for s in steps if isinstance(s, TextDelta))


def _types(steps: list[AgentStep]) -> list[str]:
    # Text streams in several deltas; one entry per run keeps the order readable.
    types = [s.type for s in steps if not isinstance(s, AgentFinished)]
    return [t for i, t in enumerate(types) if t != "text.delta" or types[i - 1] != t]


async def test_searches_the_question_first_and_answers_in_one_call() -> None:
    steps = await _run(VALID)
    assert _types(steps) == [
        *FIRST_SEARCH,
        "llm.started",
        "generation.started",
        "text.delta",
        "llm.completed",
    ]
    assert _text(steps) == "He works at Phytech."
    answer = _finished(steps).answer
    assert answer is not None
    assert answer.citations == ["work"]
    assert _finished(steps).usage.requests == 1


async def test_the_first_search_is_shown_as_the_models_own_call() -> None:
    sent: list[ModelMessage] = []
    with agent.override(model=scripted(VALID, record=sent)):
        [s async for s in run_agent("Where?", make_deps(RETRIEVER), [])]
    calls = [p for m in sent for p in m.parts if isinstance(p, ToolCallPart)]
    returns = [p for m in sent for p in m.parts if isinstance(p, ToolReturnPart)]
    assert [(c.tool_name, c.args) for c in calls] == [
        ("search_knowledge", {"query": "Where?"})
    ]
    assert "Eliyahu works at Phytech" in str(returns[0].content)


async def test_the_model_can_still_search_again() -> None:
    steps = await _run(SEARCH, VALID)
    assert _types(steps) == [
        *FIRST_SEARCH,
        "llm.started",
        "llm.completed",
        *FIRST_SEARCH,
        "llm.started",
        "generation.started",
        "text.delta",
        "llm.completed",
    ]


async def test_an_unread_citation_is_dropped_without_a_retry() -> None:
    steps = await _run(FORGED)
    answer = _finished(steps).answer
    assert answer is not None
    assert answer.citations == []
    assert _finished(steps).usage.requests == 1


async def test_gives_up_after_one_failed_retry() -> None:
    uncited: Turn = ("answer", {**VALID[1], "citations": []})
    steps = await _run(uncited, retriever=StubRetriever([]))
    assert _text(steps) == ""
    assert _finished(steps).answer is None
    assert _finished(steps).usage.requests == 2


async def test_answer_without_any_tool_result_is_rejected() -> None:
    uncited: Turn = ("answer", {**VALID[1], "citations": []})
    steps = await _run(uncited, retriever=StubRetriever([]))
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
    # The model's own calls are capped; the first search comes on top.
    assert len(tool_calls) <= Settings().agent_max_tool_calls + 1
    assert _finished(steps).answer is None


async def test_the_last_allowed_call_can_only_answer() -> None:
    offered: list[list[str]] = []

    async def searcher(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[str | DeltaToolCalls]:
        offered.append([t.name for t in info.function_tools])
        if info.function_tools:
            yield {0: DeltaToolCall(name=SEARCH[0], json_args=json.dumps(SEARCH[1]))}
        else:
            yield json.dumps(VALID[1])

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
    uncited: Turn = ("answer", {**VALID[1], "citations": []})
    steps = await _run(SEARCH, uncited, VALID, retriever=StubRetriever([]))
    calls = [s for s in steps if isinstance(s, LlmCompleted)]
    assert [(c.call, c.decision, c.tools) for c in calls] == [
        (1, "tools", ["search_knowledge"]),
        (2, "answer", []),
        (3, "answer", []),
    ]
    assert calls[1].rejected is not None
    assert "without any tool result" in calls[1].rejected
    assert all(c.input_tokens > 0 and not c.fallback for c in calls)
