import json
from collections.abc import AsyncIterator

from app.events import Event, RequestFinished, RequestStarted, StreamEvent, TextDelta
from app.stream import ui_message_stream


async def _events(*events: Event) -> AsyncIterator[StreamEvent]:
    for seq, event in enumerate(events):
        yield StreamEvent(request_id="r1", seq=seq, t_ms=seq, event=event)


async def _parts(*events: Event) -> list[str]:
    return [line async for line in ui_message_stream(_events(*events))]


async def test_answer_as_text_parts_and_everything_else_as_data() -> None:
    lines = await _parts(
        RequestStarted(model="m", provider="p", rules_version="v2"),
        TextDelta(text="Hel"),
        TextDelta(text="lo"),
        RequestFinished(outcome="answered"),
    )
    assert all(line.startswith("data: ") and line.endswith("\n\n") for line in lines)
    assert lines[-1] == "data: [DONE]\n\n"
    parts = [json.loads(line[6:]) for line in lines[:-1]]
    assert [p["type"] for p in parts] == [
        "start",
        "data-event",
        "text-start",
        "text-delta",
        "text-delta",
        "data-event",
        "text-end",
        "finish",
    ]
    assert parts[0]["messageId"] == "r1"
    assert "".join(p["delta"] for p in parts if p["type"] == "text-delta") == "Hello"
    assert parts[1]["data"]["event"]["type"] == "request.started"
    assert parts[1]["data"]["seq"] == 0


async def test_no_text_parts_when_there_is_no_answer() -> None:
    lines = await _parts(RequestFinished(outcome="blocked"))
    types = [json.loads(line[6:])["type"] for line in lines[:-1]]
    assert types == ["start", "data-event", "finish"]
