"""Turns pipeline steps into numbered, timed events, and records each one.

Every event goes through `Emitter.emit`, which fans it out three ways:
- the browser stream (the returned `StreamEvent`, written by `app/stream.py`);
- an OpenTelemetry trace (exported to Langfuse by `app/tracing.py`): one
  request span with a child span per stage (guardrails, each model call,
  each tool call) built from the same events the browser shows;
- one structlog line per event.
`text.delta` goes to the browser only. Logs and traces never carry the
visitor's words: values derived from the question are masked, and no span
gets Langfuse's input/output attributes (D4).
"""

import json
import time

import structlog
from opentelemetry import trace
from opentelemetry.trace import Span, Status, StatusCode
from opentelemetry.util.types import AttributeValue

from app.events import (
    CitationsAttached,
    ErrorEvent,
    Event,
    GuardrailsChecked,
    LlmCompleted,
    LlmStarted,
    RequestFinished,
    RetrievalCompleted,
    StreamEvent,
    TextDelta,
    ToolCalled,
    ToolCompleted,
)

MASKED = "[masked]"
# Fields the model fills from the visitor's question (search queries, tool args).
_VISITOR_FIELDS = {"args", "query"}
# Langfuse observation types; a type it doesn't know falls back to a plain span.
_TYPE = "langfuse.observation.type"
_TOOL_TYPES = {"search_knowledge": "retriever"}

_tracer = trace.get_tracer("portfolio-chat")
_log = structlog.get_logger("events")


def safe_fields(event: Event) -> dict[str, object]:
    """The event's fields with visitor-derived text masked, for logs and traces."""
    fields = event.model_dump(mode="json", exclude={"type"})
    for name in _VISITOR_FIELDS & fields.keys():
        fields[name] = MASKED
    if isinstance(event, CitationsAttached):
        fields["citations"] = [c.chunk_id for c in event.citations]
    return fields


def tool_type(tool: str) -> str:
    """The Langfuse observation type of a tool's span."""
    return _TOOL_TYPES.get(tool, "tool")


def _attribute(value: object) -> AttributeValue:
    if isinstance(value, str | bool | int | float):
        return value
    return json.dumps(value, ensure_ascii=False)


def _attributes(fields: dict[str, object]) -> dict[str, AttributeValue]:
    return {k: _attribute(v) for k, v in fields.items() if v is not None}


class Emitter:
    """The only place events are created and recorded."""

    def __init__(self, request_id: str) -> None:
        self.request_id = request_id
        self._seq = 0
        self._start = time.perf_counter()
        self._start_ns = time.time_ns()
        # A request whose client disconnects never reaches request.finished,
        # so its span is never ended or exported; the browser never saw it either.
        self._span = _tracer.start_span(
            "chat",
            start_time=self._start_ns,
            attributes={"request_id": request_id, "langfuse.trace.name": "chat"},
        )
        self._context = trace.set_span_in_context(self._span)
        self._open: dict[str, list[Span]] = {}

    def elapsed_ms(self) -> int:
        """Milliseconds since this request started."""
        return int((time.perf_counter() - self._start) * 1000)

    def emit(self, event: Event) -> StreamEvent:
        """Stamp an event with the request id, sequence and time, and record it."""
        stamped = StreamEvent(
            request_id=self.request_id,
            seq=self._seq,
            t_ms=self.elapsed_ms(),
            event=event,
        )
        self._seq += 1
        if not isinstance(event, TextDelta):
            self._record(stamped)
        return stamped

    def _record(self, stamped: StreamEvent) -> None:
        event = stamped.event
        fields = safe_fields(event)
        _log.info(
            event.type,
            request_id=self.request_id,
            stage=event.type.split(".")[0],
            seq=stamped.seq,
            t_ms=stamped.t_ms,
            **fields,
        )
        self._span.add_event(
            event.type,
            {"seq": stamped.seq, "t_ms": stamped.t_ms} | _attributes(fields),
        )
        self._stage(event, fields, self._start_ns + stamped.t_ms * 1_000_000)

    def _stage(self, event: Event, fields: dict[str, object], at: int) -> None:
        """Open or close the stage span this event marks."""
        match event:
            case GuardrailsChecked():
                span = self._child("guardrails", self._start_ns, "guardrail")
                span.set_attributes(_attributes(fields))
                span.end(end_time=at)
            case LlmStarted(call=call):
                self._open[f"llm.{call}"] = [
                    self._child(f"model call {call}", at, "generation")
                ]
            case LlmCompleted(call=call):
                span = self._close(f"llm.{call}") or self._child(
                    f"model call {call}", at, "generation"
                )
                span.set_attributes(
                    _attributes(fields)
                    | {
                        "langfuse.observation.model.name": event.model,
                        "langfuse.observation.usage_details": json.dumps(
                            {"input": event.input_tokens, "output": event.output_tokens}
                        ),
                        "langfuse.observation.cost_details": json.dumps(
                            {"total": event.cost_usd}
                        ),
                    }
                )
                span.end(end_time=at)
            case ToolCalled(tool=tool):
                span = self._child(tool, at, tool_type(tool))
                span.set_attribute("args", MASKED)
                self._open.setdefault(tool, []).append(span)
            case RetrievalCompleted():
                if open_search := self._open.get("search_knowledge"):
                    open_search[0].set_attributes(_attributes(fields))
            case ToolCompleted(tool=tool):
                if done := self._close(tool):
                    done.set_attributes(_attributes(fields))
                    done.end(end_time=at)
            case ErrorEvent(code=code):
                self._span.set_status(Status(StatusCode.ERROR, code))
            case RequestFinished(outcome=outcome):
                for spans in self._open.values():
                    for span in spans:
                        span.end(end_time=at)
                self._span.set_attribute("outcome", outcome)
                self._span.end(end_time=at)

    def _child(self, name: str, start: int, kind: str) -> Span:
        return _tracer.start_span(
            name, context=self._context, start_time=start, attributes={_TYPE: kind}
        )

    def _close(self, key: str) -> Span | None:
        """The oldest open span for this key, removed from the open list."""
        spans = self._open.get(key)
        return spans.pop(0) if spans else None
