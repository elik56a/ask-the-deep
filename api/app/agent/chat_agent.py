"""The agent loop: the model decides which tools to call, then writes a checked answer.

The visitor's question is searched once before the first model call, so most
questions are answered from that search in one call (ADR 0020). If the main
model fails (provider error), a backup model takes over when
LLM_FALLBACK_MODEL is set. Limits cap how many model and tool calls one
question may use; on the last allowed model call the tools are hidden, so
the model answers from what it has found instead of searching on. The answer is
structured (kind, citations, text), streamed as JSON so its words arrive as
they are written, and checked in code: citations of passages no tool returned
are dropped, and an "answered" reply needs at least one tool result. A failed
check makes the model retry once; after that, no answer.

`run_agent` turns the run into steps (events plus a final `AgentFinished`), so
the pipeline never touches Pydantic AI directly.
"""

import json
import time
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import structlog
from pydantic import BaseModel
from pydantic_ai import (
    Agent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelRetry,
    NativeOutput,
    RunContext,
    ToolReturn,
    UsageLimits,
)
from pydantic_ai.capabilities import PrepareTools
from pydantic_ai.exceptions import UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.test import TestModel
from pydantic_ai.result import AgentStream
from pydantic_ai.tools import ToolDefinition
from pydantic_ai.usage import RunUsage

from app.agent.tools import TOOLS, AgentDeps, ToolMeta, search
from app.config import Settings
from app.events import (
    GenerationStarted,
    LlmCompleted,
    LlmStarted,
    RetrievalCompleted,
    RetrievalStarted,
    ScoredPassage,
    TextDelta,
    ToolCalled,
    ToolCompleted,
)
from app.rag.retrieval import Hit

_PROMPTS = Path(__file__).parent / "prompts"
_SEARCH = "search_knowledge"
# The search run before the first model call, shown to the model as its own first call.
_FIRST_SEARCH_ID = "first-search"
_log = structlog.get_logger("agent")
_TEST_ANSWER = "This is the offline test model. Set LLM_MODEL for real answers."


class Answer(BaseModel):
    """The model's final reply.

    Field order matters: `citations` is generated before `text`, so the
    citations can be checked before any text reaches the visitor.
    """

    kind: Literal["answered", "no_information", "smalltalk"]
    citations: list[str]
    text: str


class PastMessage(BaseModel):
    """An earlier message of the conversation, sent by the browser (never stored)."""

    role: Literal["user", "assistant"]
    text: str


@dataclass(frozen=True)
class AgentFinished:
    """The end of a run. `answer` is None when no valid answer came within limits."""

    answer: Answer | None
    usage: RunUsage
    cost_usd: float


AgentStep = (
    LlmStarted
    | LlmCompleted
    | ToolCalled
    | RetrievalStarted
    | RetrievalCompleted
    | ToolCompleted
    | GenerationStarted
    | TextDelta
    | AgentFinished
)


def _last_call_answers(
    ctx: RunContext[AgentDeps], tool_defs: list[ToolDefinition]
) -> list[ToolDefinition]:
    # A model that keeps searching would hit the request limit and lose an
    # answer it already has, so the last allowed call can only answer.
    return [] if ctx.run_step >= ctx.deps.settings.agent_max_requests else tool_defs


agent = Agent(
    # JSON output streams as text, so the answer's words show as they are written;
    # as an output tool call it would only arrive once the call ends.
    output_type=NativeOutput(Answer),
    deps_type=AgentDeps,
    tools=TOOLS,
    retries=1,
    capabilities=[PrepareTools(_last_call_answers)],
)
_TOOL_NAMES = {tool.name for tool in TOOLS}


@dataclass
class _Attempt:
    """What happened to one model call's answer while it streamed."""

    rejected: str | None = None


def answer_problem(answer: Answer, deps: AgentDeps) -> str | None:
    """Why this answer may not be shown, phrased as feedback for the model."""
    if answer.kind == "answered" and not deps.successful_tools:
        return (
            "You answered without any tool result. Call a tool or reply no_information."
        )
    return None


def read_only(answer: Answer, deps: AgentDeps) -> Answer:
    """The answer citing only passages a tool returned in this run.

    A made-up id is dropped rather than failing the answer: the text still
    stands on the passages that were read, and a retry would cost a model call.
    """
    cited = [c for c in answer.citations if c in deps.seen]
    if len(cited) < len(answer.citations):
        _log.warning("citations_dropped", count=len(answer.citations) - len(cited))
    return answer.model_copy(update={"citations": cited})


@agent.output_validator
def _check_answer(ctx: RunContext[AgentDeps], answer: Answer) -> Answer:
    if ctx.partial_output:
        return answer
    if problem := answer_problem(answer, ctx.deps):
        raise ModelRetry(problem)
    return read_only(answer, ctx.deps)


def _model(settings: Settings) -> Model | str:
    if settings.llm_model == "test":
        return TestModel(
            call_tools=[_SEARCH],
            custom_output_text=json.dumps(
                {"kind": "answered", "citations": [], "text": _TEST_ANSWER}
            ),
        )
    if settings.llm_fallback_model:
        return FallbackModel(settings.llm_model, settings.llm_fallback_model)
    return settings.llm_model


def cost_usd(messages: Sequence[ModelMessage]) -> float:
    """What the run's model calls cost at list prices (from genai-prices).

    Each response is priced by the model that actually produced it, so a run
    that fell back to the backup model is charged correctly. Unknown models
    (the offline test model) count as free.
    """
    total = 0.0
    for message in messages:
        if isinstance(message, ModelResponse) and message.model_name:
            try:
                total += float(message.cost().total_price)
            except LookupError:
                continue
    return total


def _instructions(settings: Settings) -> str:
    return (_PROMPTS / f"answer_{settings.rules_version}.md").read_text(
        encoding="utf-8"
    )


def _history(messages: list[PastMessage]) -> list[ModelMessage]:
    return [
        ModelRequest(parts=[UserPromptPart(m.text)])
        if m.role == "user"
        else ModelResponse(parts=[TextPart(m.text)])
        for m in messages
    ]


def _first_search(question: str, result: ToolReturn) -> list[ModelMessage]:
    """The question and its first search, as the model would have asked for it."""
    return [
        ModelRequest(parts=[UserPromptPart(question)]),
        ModelResponse(
            parts=[
                ToolCallPart(
                    _SEARCH, {"query": question}, tool_call_id=_FIRST_SEARCH_ID
                )
            ]
        ),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    _SEARCH, result.return_value, tool_call_id=_FIRST_SEARCH_ID
                )
            ]
        ),
    ]


def _scored(hits: list[Hit], threshold: float) -> list[ScoredPassage]:
    return [
        ScoredPassage(
            chunk_id=h.chunk.chunk_id,
            breadcrumb=h.chunk.breadcrumb,
            score=round(h.similarity, 3),
            above_threshold=h.similarity >= threshold,
        )
        for h in hits
    ]


def _call_args(event: FunctionToolCallEvent) -> dict[str, str]:
    try:
        return {k: str(v) for k, v in event.part.args_as_dict().items()}
    except (ValueError, json.JSONDecodeError):
        return {}


class _ToolTracker:
    """Turns tool call/result events into our events, timing each call."""

    def __init__(self, threshold: float) -> None:
        self._threshold = threshold
        self._started: dict[str, float] = {}

    def steps(self, event: object) -> list[AgentStep]:
        if isinstance(event, FunctionToolCallEvent):
            call = event.part
            return self.called(call.tool_name, call.tool_call_id, _call_args(event))
        if isinstance(event, FunctionToolResultEvent):
            result = event.part
            meta = result.metadata if isinstance(result, ToolReturnPart) else None
            tool = result.tool_name or "unknown"
            return self.completed(tool, result.tool_call_id, meta)
        return []

    def called(self, tool: str, call_id: str, args: dict[str, str]) -> list[AgentStep]:
        self._started[call_id] = time.monotonic()
        steps: list[AgentStep] = [ToolCalled(tool=tool, args=args)]
        if tool == _SEARCH:
            steps.append(RetrievalStarted(query=args.get("query", "")))
        return steps

    def completed(self, tool: str, call_id: str, metadata: object) -> list[AgentStep]:
        meta = (
            metadata if isinstance(metadata, ToolMeta) else ToolMeta(ok=False, count=0)
        )
        started = self._started.pop(call_id, time.monotonic())
        steps: list[AgentStep] = []
        if tool == _SEARCH:
            steps.append(
                RetrievalCompleted(
                    passages=_scored(meta.hits, self._threshold),
                    threshold=self._threshold,
                )
            )
        steps.append(
            ToolCompleted(
                tool=tool,
                ok=meta.ok,
                result_count=meta.count,
                duration_ms=round((time.monotonic() - started) * 1000),
                passage_ids=meta.passage_ids,
            )
        )
        return steps


def _llm_completed(
    call: int,
    response: ModelResponse,
    started: float,
    attempt: _Attempt,
    settings: Settings,
) -> LlmCompleted:
    calls = [p.tool_name for p in response.parts if isinstance(p, ToolCallPart)]
    tools = [name for name in calls if name in _TOOL_NAMES]
    # The answer is JSON text (native output); a reply with neither is plain text.
    wrote = any(isinstance(p, TextPart) and p.content for p in response.parts)
    decision: Literal["tools", "answer", "text"] = (
        "tools" if tools else "answer" if calls or wrote else "text"
    )
    fallback_name = (settings.llm_fallback_model or "").partition(":")[2]
    return LlmCompleted(
        call=call,
        model=response.model_name or "unknown",
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        cost_usd=cost_usd([response]),
        duration_ms=round((time.monotonic() - started) * 1000),
        decision=decision,
        tools=tools,
        fallback=bool(fallback_name) and response.model_name == fallback_name,
        rejected=attempt.rejected,
    )


async def _answer_steps(
    stream: AgentStream[AgentDeps, Answer], deps: AgentDeps, attempt: _Attempt
) -> AsyncIterator[AgentStep]:
    shown = 0
    held = False
    try:
        async for partial in stream.stream_output(debounce_by=None):
            if held or not partial.text:
                continue
            if shown == 0:
                # Hold back an invalid attempt entirely; the agent retries it.
                if problem := answer_problem(partial, deps):
                    attempt.rejected = problem
                    held = True
                    continue
                # Gemini caches repeated prompt prefixes on its own (implicit
                # caching, ADR 0015); this reports whether it did in this run.
                yield GenerationStarted(
                    context_chunks=len(deps.seen),
                    prompt_cache_hit=stream.usage.cache_read_tokens > 0,
                )
            if len(partial.text) > shown:
                yield TextDelta(text=partial.text[shown:])
                shown = len(partial.text)
    except UnexpectedModelBehavior:
        # Final check failed while streaming; the agent graph runs the retry.
        return


async def run_agent(
    question: str, deps: AgentDeps, history: list[PastMessage]
) -> AsyncIterator[AgentStep]:
    """Run the agent for one question, yielding a step for everything it does.

    `history` lets the model resolve follow-ups ("and what does he do there?")
    into specific search queries; facts still have to come from this run's tools.
    """
    settings = deps.settings
    tracker = _ToolTracker(settings.retrieval_threshold)
    usage = RunUsage()
    cost = 0.0
    call = 0
    answer: Answer | None = None
    # Searching first saves the model a whole call on most questions (ADR 0020).
    args = {"query": question}
    for step in tracker.called(_SEARCH, _FIRST_SEARCH_ID, args):
        yield step
    first = await search(deps, question)
    for step in tracker.completed(_SEARCH, _FIRST_SEARCH_ID, first.metadata):
        yield step
    try:
        async with agent.iter(
            message_history=[*_history(history), *_first_search(question, first)],
            deps=deps,
            model=_model(settings),
            instructions=_instructions(settings),
            model_settings={
                "max_tokens": settings.max_output_tokens,
                "timeout": settings.llm_timeout_s,
                "thinking": settings.llm_thinking,
            },
            usage_limits=UsageLimits(
                request_limit=settings.agent_max_requests,
                tool_calls_limit=settings.agent_max_tool_calls,
            ),
        ) as run:
            try:
                async for node in run:
                    if Agent.is_model_request_node(node):
                        call += 1
                        yield LlmStarted(call=call)
                        started, attempt = time.monotonic(), _Attempt()
                        async with node.stream(run.ctx) as stream:
                            async for step in _answer_steps(stream, deps, attempt):
                                yield step
                        yield _llm_completed(
                            call, stream.response, started, attempt, settings
                        )
                    elif Agent.is_call_tools_node(node):
                        async with node.stream(run.ctx) as events:
                            async for event in events:
                                for step in tracker.steps(event):
                                    yield step
                answer = run.result.output if run.result else None
            finally:
                usage = run.usage
                cost = cost_usd(run.new_messages())
    except (UnexpectedModelBehavior, UsageLimitExceeded):
        answer = None
    yield AgentFinished(answer=answer, usage=usage, cost_usd=cost)
