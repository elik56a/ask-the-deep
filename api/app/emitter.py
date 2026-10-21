"""Turns pipeline steps into numbered, timed events, and records each one.

Every event goes through `Emitter.emit`, which fans it out three ways:
- the browser stream (the returned `StreamEvent`, written by `app/stream.py`);
- an OpenTelemetry span per request, one span event per event (P3.4 exports it);
- one structlog line per event.
`text.delta` goes to the browser only. Logs and traces never carry the
visitor's words: values derived from the question are masked (D4).
"""

import json
import time

import structlog
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.util.types import AttributeValue

from app.events import (
    CitationsAttached,
    ErrorEvent,
    Event,
    RequestFinished,
    StreamEvent,
    TextDelta,
)

MASKED = "[masked]"
# Fields the model fills from the visitor's question (search queries, tool args).
_VISITOR_FIELDS = {"args", "query"}

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


def _attribute(value: object) -> AttributeValue:
    if isinstance(value, str | bool | int | float):
        return value
    return json.dumps(value, ensure_ascii=False)


class Emitter:
    """The only place events are created and recorded."""

    def __init__(self, request_id: str) -> None:
        self.request_id = request_id
        self._seq = 0
        self._start = time.perf_counter()
        # A request whose client disconnects never reaches request.finished,
        # so its span is never ended or exported; the browser never saw it either.
        self._span = _tracer.start_span(
            "request", attributes={"request_id": request_id}
        )

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
            seq=stamped.seq,
            t_ms=stamped.t_ms,
            **fields,
        )
        self._span.add_event(
            event.type,
            {"seq": stamped.seq, "t_ms": stamped.t_ms}
            | {k: _attribute(v) for k, v in fields.items() if v is not None},
        )
        if isinstance(event, ErrorEvent):
            self._span.set_status(Status(StatusCode.ERROR, event.code))
        if isinstance(event, RequestFinished):
            self._span.set_attribute("outcome", event.outcome)
            self._span.end()
