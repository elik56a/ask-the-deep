"""What happens to one question, from guardrails to the last event.

guardrails -> agent loop (the model calls tools, then answers) -> summary.
Every step becomes an event, so the browser can show what the system is
doing in real time.
"""

import re
from collections.abc import AsyncIterator
from uuid import uuid4

from app.agent.chat_agent import AgentFinished, Answer, PastMessage, run_agent
from app.agent.github import GitHubActivity
from app.agent.tools import AgentDeps
from app.config import Settings
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
_EXCERPT_CHARS = 200
_RATE_LIMITED = ErrorEvent(
    code="rate_limited", message="Too many questions. Please wait a minute."
)
_INPUT_REJECTED = ErrorEvent(
    code="input_rejected", message="The question or conversation is empty or too long."
)


def _language(text: str) -> str:
    return "he" if _HEBREW.search(text) else "en"


def _guardrails(
    question: str,
    history: list[PastMessage],
    settings: Settings,
    within_rate_limit: bool,
) -> list[GuardrailCheck]:
    return [
        GuardrailCheck(name="rate_limit", passed=within_rate_limit),
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


async def run_pipeline(
    question: str,
    settings: Settings,
    retriever: Retriever,
    github: GitHubActivity,
    history: list[PastMessage] | None = None,
    within_rate_limit: bool = True,
) -> AsyncIterator[StreamEvent]:
    """Answer one question, yielding an event after every step.

    If the agent gives no valid answer within its limits, the visitor gets
    "I don't have that information" instead of a guess.
    """
    em = Emitter(uuid4().hex)
    provider, model = settings.llm_provider_and_name
    yield em.emit(
        RequestStarted(
            model=model, provider=provider, rules_version=settings.rules_version
        )
    )

    history = history or []
    checks = _guardrails(question, history, settings, within_rate_limit)
    yield em.emit(GuardrailsChecked(checks=checks))
    if not all(c.passed for c in checks):
        yield em.emit(_RATE_LIMITED if not within_rate_limit else _INPUT_REJECTED)
        yield em.emit(RequestFinished(outcome="blocked"))
        return

    deps = AgentDeps(retriever=retriever, github=github, settings=settings)
    ttft_ms: int | None = None
    finished: AgentFinished | None = None
    try:
        async for step in run_agent(question, deps, history):
            if isinstance(step, AgentFinished):
                finished = step
                continue
            if isinstance(step, TextDelta) and ttft_ms is None:
                ttft_ms = em.elapsed_ms()
            yield em.emit(step)
    except Exception:
        finished = None
    if finished is None:
        yield em.emit(ErrorEvent(code="generation_failed", message=_GENERATION_FAILED))
        yield em.emit(RequestFinished(outcome="error"))
        return

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
