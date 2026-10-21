from pathlib import Path

import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
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
    RequestFinished,
    RetrievalStarted,
    TextDelta,
    ToolCalled,
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


def test_one_span_per_request_with_an_event_per_step(
    spans: InMemorySpanExporter,
) -> None:
    _run(Emitter("r1"))

    [span] = spans.get_finished_spans()
    assert span.attributes is not None
    assert span.attributes["request_id"] == "r1"
    assert span.attributes["outcome"] == "error"
    assert span.status.status_code == trace.StatusCode.ERROR
    assert [e.name for e in span.events] == [
        "tool.called",
        "retrieval.started",
        "citations.attached",
        "error",
        "request.finished",
    ]
    assert QUESTION_WORDS not in str([e.attributes for e in span.events])


def test_only_the_emitter_creates_stream_events() -> None:
    app = Path(__file__).parents[1] / "app"
    writers = [
        p.name
        for p in app.rglob("*.py")
        if "StreamEvent(" in p.read_text() and p.name not in {"emitter.py", "events.py"}
    ]
    assert writers == []
