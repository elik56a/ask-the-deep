"""Turns pipeline steps into numbered, timed events for the browser."""

import time

from app.events import Event, StreamEvent


class Emitter:
    """The only place events are created; P3 adds tracing and log fan-out here."""

    def __init__(self, request_id: str) -> None:
        self.request_id = request_id
        self._seq = 0
        self._start = time.perf_counter()

    def elapsed_ms(self) -> int:
        """Milliseconds since this request started."""
        return int((time.perf_counter() - self._start) * 1000)

    def emit(self, event: Event) -> StreamEvent:
        """Wrap an event with the request id, its sequence number and its time."""
        stamped = StreamEvent(
            request_id=self.request_id,
            seq=self._seq,
            t_ms=self.elapsed_ms(),
            event=event,
        )
        self._seq += 1
        return stamped
