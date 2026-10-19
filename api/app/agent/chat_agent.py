"""The agent loop: the model decides which tools to call, then writes a checked answer.

If the main model fails (provider error), a backup model takes over when
LLM_FALLBACK_MODEL is set. Limits cap how many model and tool calls one
question may use. The answer is
structured (kind, citations, text) and checked in code: it may cite only
passages a tool returned, and an "answered" reply needs at least one tool
result. A failed check makes the model retry once; after that, no answer.

`run_agent` turns the run into steps (events plus a final `AgentFinished`), so
the pipeline never touches Pydantic AI directly.
"""

import json
import time
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import BaseModel
from pydantic_ai import (
    Agent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelRetry,
    RunContext,
    UsageLimits,
)
from pydantic_ai.exceptions import UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.test import TestModel
from pydantic_ai.result import AgentStream
from pydantic_ai.usage import RunUsage

from app.agent.tools import TOOLS, AgentDeps, ToolMeta
from app.config import Settings
from app.events import (
    GenerationStarted,
    RetrievalCompleted,
    RetrievalStarted,
    ScoredPassage,
    TextDelta,
    ToolCalled,
    ToolCompleted,
)
from app.rag.retrieval import Hit

_PROMPTS = Path(__file__).parent / "prompts"
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
    ToolCalled
    | RetrievalStarted
    | RetrievalCompleted
    | ToolCompleted
    | GenerationStarted
    | TextDelta
    | AgentFinished
)

agent = Agent(output_type=Answer, deps_type=AgentDeps, tools=TOOLS, retries=1)


def answer_problem(answer: Answer, deps: AgentDeps) -> str | None:
    """Why this answer may not be shown, phrased as feedback for the model."""
    forged = [c for c in answer.citations if c not in deps.seen]
    if forged:
        return (
            f"Citations {forged} were not returned by any tool. Cite only ids you read."
        )
    if answer.kind == "answered" and not deps.successful_tools:
        return (
            "You answered without any tool result. Call a tool or reply no_information."
        )
    return None


@agent.output_validator
def _check_answer(ctx: RunContext[AgentDeps], answer: Answer) -> Answer:
    if not ctx.partial_output and (problem := answer_problem(answer, ctx.deps)):
        raise ModelRetry(problem)
    return answer


def _model(settings: Settings) -> Model | str:
    if settings.llm_model == "test":
        return TestModel(
            call_tools=["search_knowledge"],
            custom_output_args={
                "kind": "answered",
                "citations": [],
                "text": _TEST_ANSWER,
            },
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
            return self._called(event)
        if isinstance(event, FunctionToolResultEvent):
            return self._completed(event)
        return []

    def _called(self, event: FunctionToolCallEvent) -> list[AgentStep]:
        self._started[event.part.tool_call_id] = time.monotonic()
        args = _call_args(event)
        steps: list[AgentStep] = [ToolCalled(tool=event.part.tool_name, args=args)]
        if event.part.tool_name == "search_knowledge":
            steps.append(RetrievalStarted(query=args.get("query", "")))
        return steps

    def _completed(self, event: FunctionToolResultEvent) -> list[AgentStep]:
        part = event.part
        meta = part.metadata if isinstance(part, ToolReturnPart) else None
        meta = meta if isinstance(meta, ToolMeta) else ToolMeta(ok=False, count=0)
        started = self._started.pop(part.tool_call_id, time.monotonic())
        tool = part.tool_name or "unknown"
        steps: list[AgentStep] = []
        if tool == "search_knowledge":
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
            )
        )
        return steps


async def _answer_steps(
    stream: AgentStream[AgentDeps, Answer], deps: AgentDeps
) -> AsyncIterator[AgentStep]:
    shown = 0
    held = False
    try:
        async for partial in stream.stream_output(debounce_by=None):
            if held or not partial.text:
                continue
            if shown == 0:
                # Hold back an invalid attempt entirely; the agent retries it.
                if answer_problem(partial, deps):
                    held = True
                    continue
                yield GenerationStarted(
                    context_chunks=len(deps.seen), prompt_cache_hit=False
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
    answer: Answer | None = None
    try:
        async with agent.iter(
            question,
            message_history=_history(history),
            deps=deps,
            model=_model(settings),
            instructions=_instructions(settings),
            model_settings={
                "max_tokens": settings.max_output_tokens,
                "timeout": settings.llm_timeout_s,
            },
            usage_limits=UsageLimits(
                request_limit=settings.agent_max_requests,
                tool_calls_limit=settings.agent_max_tool_calls,
            ),
        ) as run:
            try:
                async for node in run:
                    if Agent.is_model_request_node(node):
                        async with node.stream(run.ctx) as stream:
                            async for step in _answer_steps(stream, deps):
                                yield step
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
