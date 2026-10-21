import json
from collections.abc import Sequence
from pathlib import Path

import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import (
    InMemorySpanExporter,
)
from structlog.testing import capture_logs

from app import emitter
from app.emitter import MASKED, Emitter
from app.events import (
    Citation,
    CitationsAttached,
    ErrorEvent,
    GuardrailCheck,
    GuardrailsChecked,
    LlmCompleted,
    LlmStarted,
    RequestFinished,
    RetrievalCompleted,
    RetrievalStarted,
    TextDelta,
    ToolCalled,
    ToolCompleted,
)

QUESTION_WORDS = "where does he work"


@pytest.fixture
def spans(monkeypatch: pytest.MonkeyPatch) -> InMemorySpanExporter:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    monkeypatch.setattr(emitter, "_tracer", provider.get_tracer("test"))
    return exporter


def _run(em: Emitter) -> None:
    em.emit(ToolCalled(tool="search_knowledge", args={"query": QUESTION_WORDS}))
    em.emit(RetrievalStarted(query=QUESTION_WORDS))
    em.emit(TextDelta(text="He works at Phytech"))
    em.emit(
        CitationsAttached(
            citations=[
                Citation(chunk_id="a#b", source="a.md", breadcrumb="A", excerpt="x")
            ]
        )
    )
    em.emit(ErrorEvent(code="timeout", message="Took too long"))
    em.emit(RequestFinished(outcome="error"))


def test_logs_every_event_but_text_and_masks_the_visitor(
    spans: InMemorySpanExporter,
) -> None:
    with capture_logs() as logs:
        _run(Emitter("r1"))

    assert [log["event"] for log in logs] == [
        "tool.called",
        "retrieval.started",
        "citations.attached",
        "error",
        "request.finished",
    ]
    assert all(log["request_id"] == "r1" for log in logs)
    assert logs[0]["args"] == MASKED
    assert logs[1]["query"] == MASKED
    assert logs[2]["citations"] == ["a#b"]
    assert QUESTION_WORDS not in str(logs)
    assert "Phytech" not in str(logs)


def test_one_request_span_with_an_event_per_step(
    spans: InMemorySpanExporter,
) -> None:
    _run(Emitter("r1"))

    root = _by_name(spans)["chat"]
    assert root.attributes is not None
    assert root.attributes["request_id"] == "r1"
    assert root.attributes["outcome"] == "error"
    assert root.status.status_code == trace.StatusCode.ERROR
    assert [e.name for e in root.events] == [
        "tool.called",
        "retrieval.started",
        "citations.attached",
        "error",
        "request.finished",
    ]
    assert QUESTION_WORDS not in str(_all_attributes(spans))


def test_a_child_span_per_stage_with_tokens_and_cost(
    spans: InMemorySpanExporter,
) -> None:
    em = Emitter("r1")
    em.emit(GuardrailsChecked(checks=[GuardrailCheck(name="budget", passed=True)]))
    em.emit(LlmStarted(call=1))
    em.emit(_llm_completed(1))
    em.emit(ToolCalled(tool="search_knowledge", args={"query": QUESTION_WORDS}))
    em.emit(RetrievalCompleted(passages=[], threshold=0.57))
    em.emit(
        ToolCompleted(
            tool="search_knowledge",
            ok=True,
            result_count=1,
            duration_ms=3,
            passage_ids=["a#b"],
        )
    )
    em.emit(RequestFinished(outcome="answered"))

    by_name = _by_name(spans)
    root = by_name["chat"]
    assert set(by_name) == {"chat", "guardrails", "model call 1", "search_knowledge"}
    for name in ("guardrails", "model call 1", "search_knowledge"):
        child = by_name[name]
        assert child.parent is not None
        assert child.parent.span_id == root.context.span_id
        assert child.end_time is not None
    llm = by_name["model call 1"].attributes
    assert llm is not None
    assert llm["langfuse.observation.type"] == "generation"
    assert llm["langfuse.observation.model.name"] == "gemini"
    assert json.loads(str(llm["langfuse.observation.usage_details"])) == {
        "input": 100,
        "output": 20,
    }
    assert json.loads(str(llm["langfuse.observation.cost_details"])) == {
        "total": 0.0001
    }
    search = by_name["search_knowledge"].attributes
    assert search is not None
    assert search["langfuse.observation.type"] == "retriever"
    assert search["args"] == MASKED
    assert QUESTION_WORDS not in str(_all_attributes(spans))


def _llm_completed(call: int) -> LlmCompleted:
    return LlmCompleted(
        call=call,
        model="gemini",
        input_tokens=100,
        output_tokens=20,
        cost_usd=0.0001,
        duration_ms=500,
        decision="tools",
        tools=["search_knowledge"],
        fallback=False,
        rejected=None,
    )


def _by_name(spans: InMemorySpanExporter) -> dict[str, ReadableSpan]:
    return {span.name: span for span in spans.get_finished_spans()}


def _all_attributes(spans: InMemorySpanExporter) -> Sequence[object]:
    finished = spans.get_finished_spans()
    return [s.attributes for s in finished] + [
        e.attributes for s in finished for e in s.events
    ]


def test_only_the_emitter_creates_stream_events() -> None:
    app = Path(__file__).parents[1] / "app"
    writers = [
        p.name
        for p in app.rglob("*.py")
        if "StreamEvent(" in p.read_text() and p.name not in {"emitter.py", "events.py"}
    ]
    assert writers == []
