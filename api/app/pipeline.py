"""What happens to one question, from guardrails to the last event.

guardrails -> agent loop (the model calls tools, then answers) -> summary.
Every step becomes an event, so the browser can show what the system is
doing in real time.
"""

import asyncio
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass
from uuid import uuid4

from app.agent.chat_agent import AgentFinished, Answer, PastMessage, run_agent
from app.agent.github import GitHubActivity
from app.agent.tools import AgentDeps
from app.config import Settings
from app.control.budget import Budget
from app.control.rate_limit import RateLimiter
from app.emitter import Emitter
from app.events import (
    Citation,
    CitationsAttached,
    DecisionMade,
    ErrorEvent,
    GuardrailCheck,
    GuardrailsChecked,
    RequestFinished,
    RequestStarted,
    StreamEvent,
    TextDelta,
    UsageReported,
)
from app.rag.corpus import Chunk
from app.rag.retrieval import Retriever

_HEBREW = re.compile(r"[֐-׿]")
_NO_INFORMATION = {
    "he": "אין לי את המידע הזה. אפשר לפנות לאליהו ישירות.",
    "en": "I don't have that information. You can contact Eliyahu directly.",
}
_GENERATION_FAILED = "Something went wrong while writing the answer. Please try again."
_TIMED_OUT = "That took too long. Please try again."
_EXCERPT_CHARS = 200
_NOT_VERIFIED = ErrorEvent(
    code="human_check_required",
    message="Please confirm you're human, then ask again.",
)
_RATE_LIMITED = ErrorEvent(
    code="rate_limited", message="Too many questions. Please wait a minute."
)
_OVER_BUDGET = ErrorEvent(
    code="budget_exhausted",
    message="The assistant has reached its limit for now. Please come back later.",
)
_INPUT_REJECTED = ErrorEvent(
    code="input_rejected", message="The question or conversation is empty or too long."
)


@dataclass(frozen=True)
class Services:
    """The long-lived parts every question uses, created once at startup."""

    retriever: Retriever
    github: GitHubActivity
    limiter: RateLimiter
    budget: Budget


async def _with_deadline[T](
    steps: AsyncIterator[T], seconds: float
) -> AsyncIterator[T]:
    """Yield from `steps`, raising TimeoutError once `seconds` have passed in total.

    The timeout wraps only the wait for the next step, never our own `yield`,
    so the cancellation always lands inside the agent, not in the HTTP stream.
    """
    deadline = asyncio.get_running_loop().time() + seconds
    while True:
        try:
            async with asyncio.timeout_at(deadline):
                step = await anext(steps)
        except StopAsyncIteration:
            return
        yield step


def _language(text: str) -> str:
    return "he" if _HEBREW.search(text) else "en"


async def _controls(
    services: Services, visitor: str, session_id: str | None
) -> list[GuardrailCheck]:
    """Human check, rate limit (per IP and per session) and spend caps."""
    session_key = f"session-{session_id}" if session_id else None
    ip_ok, session_ok, budget_ok = await asyncio.gather(
        services.limiter.allow(visitor),
        services.limiter.allow(session_key) if session_key else _true(),
        services.budget.allows(visitor),
    )
    return [
        GuardrailCheck(name="human_check", passed=session_id is not None),
        GuardrailCheck(name="rate_limit", passed=ip_ok and session_ok),
        GuardrailCheck(name="budget", passed=budget_ok),
    ]


async def _true() -> bool:
    return True


def _input_checks(
    question: str, history: list[PastMessage], settings: Settings
) -> list[GuardrailCheck]:
    return [
        GuardrailCheck(name="not_empty", passed=bool(question.strip())),
        GuardrailCheck(
            name="input_length", passed=len(question) <= settings.max_input_chars
        ),
        GuardrailCheck(
            name="history_size",
            passed=len(history) <= settings.max_history_messages
            and all(len(m.text) <= settings.max_history_chars for m in history),
        ),
    ]


def _citation(chunk: Chunk) -> Citation:
    return Citation(
        chunk_id=chunk.chunk_id,
        source=chunk.source,
        breadcrumb=chunk.breadcrumb,
        excerpt=chunk.text[:_EXCERPT_CHARS],
    )


def _decision(answer: Answer | None, deps: AgentDeps) -> DecisionMade:
    threshold = deps.settings.retrieval_threshold
    if answer is None or answer.kind == "no_information":
        action, reason = "no_information", "The tools found no information to answer"
    elif answer.kind == "smalltalk":
        action, reason = "answer", "Small talk, no facts needed"
    else:
        action = "answer"
        reason = f"Answered from {deps.successful_tools} successful tool result(s)"
    return DecisionMade(
        action=action, reason=reason, best_score=deps.best_score, threshold=threshold
    )


def _blocked_reason(checks: list[GuardrailCheck]) -> ErrorEvent:
    failed = {c.name for c in checks if not c.passed}
    if "human_check" in failed:
        return _NOT_VERIFIED
    if "rate_limit" in failed:
        return _RATE_LIMITED
    if "budget" in failed:
        return _OVER_BUDGET
    return _INPUT_REJECTED


async def run_pipeline(
    question: str,
    settings: Settings,
    services: Services,
    visitor: str,
    session_id: str | None,
    history: list[PastMessage] | None = None,
) -> AsyncIterator[StreamEvent]:
    """Answer one question, yielding an event after every step.

    `visitor` is the hashed IP, used for the rate limit and spend caps.
    `session_id` comes from a valid session token (None means the visitor
    hasn't passed the human check). If the agent gives no valid answer within
    its limits, the visitor gets "I don't have that information" instead of a
    guess.
    """
    em = Emitter(uuid4().hex)
    provider, model = settings.llm_provider_and_name
    yield em.emit(
        RequestStarted(
            model=model, provider=provider, rules_version=settings.rules_version
        )
    )

    history = history or []
    checks = await _controls(services, visitor, session_id)
    checks += _input_checks(question, history, settings)
    yield em.emit(GuardrailsChecked(checks=checks))
    if not all(c.passed for c in checks):
        yield em.emit(_blocked_reason(checks))
        yield em.emit(RequestFinished(outcome="blocked"))
        return

    deps = AgentDeps(
        retriever=services.retriever, github=services.github, settings=settings
    )
    ttft_ms: int | None = None
    finished: AgentFinished | None = None
    try:
        steps = run_agent(question, deps, history)
        async for step in _with_deadline(steps, settings.request_timeout_s):
            if isinstance(step, AgentFinished):
                finished = step
                continue
            if isinstance(step, TextDelta) and ttft_ms is None:
                ttft_ms = em.elapsed_ms()
            yield em.emit(step)
    except TimeoutError:
        yield em.emit(ErrorEvent(code="timeout", message=_TIMED_OUT))
        yield em.emit(RequestFinished(outcome="error"))
        return
    except Exception:
        finished = None
    if finished is None:
        yield em.emit(ErrorEvent(code="generation_failed", message=_GENERATION_FAILED))
        yield em.emit(RequestFinished(outcome="error"))
        return

    await services.budget.record(visitor, finished.cost_usd)
    answer = finished.answer
    yield em.emit(_decision(answer, deps))
    if answer is None:
        yield em.emit(TextDelta(text=_NO_INFORMATION[_language(question)]))
    else:
        cited = dict.fromkeys(answer.citations)
        yield em.emit(
            CitationsAttached(citations=[_citation(deps.seen[c]) for c in cited])
        )
    yield em.emit(
        UsageReported(
            input_tokens=finished.usage.input_tokens,
            output_tokens=finished.usage.output_tokens,
            cached_tokens=finished.usage.cache_read_tokens,
            cost_usd=finished.cost_usd,
            latency_ms=em.elapsed_ms(),
            ttft_ms=ttft_ms,
        )
    )
    no_info = answer is None or answer.kind == "no_information"
    yield em.emit(RequestFinished(outcome="no_information" if no_info else "answered"))
