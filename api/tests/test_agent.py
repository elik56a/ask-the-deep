from app.agent.chat_agent import AgentFinished, AgentStep, agent, run_agent
from app.config import Settings
from app.events import TextDelta, ToolCompleted
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
        return [s async for s in run_agent(question, make_deps(RETRIEVER))]


def _finished(steps: list[AgentStep]) -> AgentFinished:
    assert isinstance(steps[-1], AgentFinished)
    return steps[-1]


def _text(steps: list[AgentStep]) -> str:
    return "".join(s.text for s in steps if isinstance(s, TextDelta))


def _types(steps: list[AgentStep]) -> list[str]:
    return [s.type for s in steps if not isinstance(s, AgentFinished)]


async def test_searches_then_answers_with_citations() -> None:
    steps = await _run(SEARCH, VALID)
    assert _types(steps)[:5] == [
        "tool.called",
        "retrieval.started",
        "retrieval.completed",
        "tool.completed",
        "generation.started",
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
