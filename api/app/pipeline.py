import re
from collections.abc import AsyncIterator
from uuid import uuid4

from app.agent.generation import stream_answer
from app.config import Settings
from app.emitter import Emitter
from app.events import (
    Citation,
    CitationsAttached,
    DecisionMade,
    ErrorEvent,
    GenerationStarted,
    GuardrailCheck,
    GuardrailsChecked,
    RequestFinished,
    RequestStarted,
    RetrievalCompleted,
    RetrievalStarted,
    ScoredPassage,
    StreamEvent,
    TextDelta,
    UsageReported,
)
from app.rag.corpus import Chunk
from app.rag.retrieval import retrieve

_HEBREW = re.compile(r"[֐-׿]")
_NO_INFORMATION = {
    "he": "אין לי את המידע הזה. אפשר לפנות לאליהו ישירות.",
    "en": "I don't have that information. You can contact Eliyahu directly.",
}
_GENERATION_FAILED = "Something went wrong while writing the answer. Please try again."
_EXCERPT_CHARS = 200


def _language(text: str) -> str:
    return "he" if _HEBREW.search(text) else "en"


def _guardrails(question: str, settings: Settings) -> list[GuardrailCheck]:
    return [
        GuardrailCheck(name="not_empty", passed=bool(question.strip())),
        GuardrailCheck(
            name="input_length", passed=len(question) <= settings.max_input_chars
        ),
    ]


def _citation(chunk: Chunk) -> Citation:
    return Citation(
        chunk_id=chunk.chunk_id,
        source=chunk.source,
        breadcrumb=chunk.breadcrumb,
        excerpt=chunk.text[:_EXCERPT_CHARS],
    )


async def run_pipeline(
    question: str, settings: Settings, corpus: list[Chunk]
) -> AsyncIterator[StreamEvent]:
    em = Emitter(uuid4().hex)
    provider, model = settings.llm_provider_and_name
    yield em.emit(
        RequestStarted(
            model=model, provider=provider, rules_version=settings.rules_version
        )
    )

    checks = _guardrails(question, settings)
    yield em.emit(GuardrailsChecked(checks=checks))
    if not all(c.passed for c in checks):
        yield em.emit(
            ErrorEvent(
                code="input_rejected", message="The question is empty or too long."
            )
        )
        yield em.emit(RequestFinished(outcome="blocked"))
        return

    yield em.emit(RetrievalStarted(query=question))
    threshold = settings.retrieval_threshold
    hits = retrieve(corpus, question, settings.retrieval_top_k)
    yield em.emit(
        RetrievalCompleted(
            passages=[
                ScoredPassage(
                    chunk_id=h.chunk.chunk_id,
                    breadcrumb=h.chunk.breadcrumb,
                    score=round(h.score, 3),
                    above_threshold=h.score >= threshold,
                )
                for h in hits
            ],
            threshold=threshold,
        )
    )

    best = hits[0].score if hits else 0.0
    if best < threshold:
        yield em.emit(
            DecisionMade(
                action="no_information",
                reason=f"Best score {best:.2f} is below threshold {threshold:.2f}",
                best_score=best,
                threshold=threshold,
            )
        )
        yield em.emit(TextDelta(text=_NO_INFORMATION[_language(question)]))
        yield em.emit(RequestFinished(outcome="no_information"))
        return

    yield em.emit(
        DecisionMade(
            action="answer",
            reason=f"Best score {best:.2f} meets threshold {threshold:.2f}",
            best_score=best,
            threshold=threshold,
        )
    )
    accepted = [h.chunk for h in hits if h.score >= threshold]
    yield em.emit(
        GenerationStarted(context_chunks=len(accepted), prompt_cache_hit=False)
    )

    generation_start = em.elapsed_ms()
    ttft_ms: int | None = None
    try:
        async with stream_answer(question, accepted, settings) as result:
            async for delta in result.stream_text(delta=True):
                if ttft_ms is None:
                    ttft_ms = em.elapsed_ms()
                yield em.emit(TextDelta(text=delta))
            usage = result.usage
    except Exception:
        yield em.emit(ErrorEvent(code="generation_failed", message=_GENERATION_FAILED))
        yield em.emit(RequestFinished(outcome="error"))
        return

    yield em.emit(CitationsAttached(citations=[_citation(c) for c in accepted]))
    yield em.emit(
        UsageReported(
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cached_tokens=usage.cache_read_tokens,
            cost_usd=0.0,
            latency_ms=em.elapsed_ms() - generation_start,
            ttft_ms=ttft_ms,
        )
    )
    yield em.emit(RequestFinished(outcome="answered"))
