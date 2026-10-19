"""Writes our events in the Vercel AI SDK stream format, so the site can use `useChat`.

The answer goes out as text parts (`text-start` / `text-delta` / `text-end`).
Every other event goes out whole, envelope included, as a `data-event` part,
which the SDK keeps in the message: each answer carries the full record of
how it was made, for the "under the hood" panel.
"""

from collections.abc import AsyncIterator

from pydantic_ai.ui.vercel_ai.response_types import (
    BaseChunk,
    DataChunk,
    DoneChunk,
    FinishChunk,
    StartChunk,
    TextDeltaChunk,
    TextEndChunk,
    TextStartChunk,
)

from app.events import StreamEvent, TextDelta

HEADERS = {"x-vercel-ai-ui-message-stream": "v1", "Cache-Control": "no-cache"}
_SDK_VERSION = 7
_ANSWER_ID = "answer"


def _sse(chunk: BaseChunk) -> str:
    return f"data: {chunk.encode(_SDK_VERSION)}\n\n"


async def ui_message_stream(events: AsyncIterator[StreamEvent]) -> AsyncIterator[str]:
    """Translate our event stream into Vercel AI SDK server-sent events."""
    text_started = False
    async for event in events:
        if event.seq == 0:
            yield _sse(StartChunk(message_id=event.request_id))
        if isinstance(event.event, TextDelta):
            if not text_started:
                text_started = True
                yield _sse(TextStartChunk(id=_ANSWER_ID))
            yield _sse(TextDeltaChunk(id=_ANSWER_ID, delta=event.event.text))
        else:
            yield _sse(DataChunk(type="data-event", data=event.model_dump(mode="json")))
    if text_started:
        yield _sse(TextEndChunk(id=_ANSWER_ID))
    yield _sse(FinishChunk())
    yield _sse(DoneChunk())
