"""Gate test (P3.14): the dive and the Langfuse trace show the same stages.

Run against a running API with the Langfuse keys set:
`uv run --env-file .env python -m app.trace_gate [api_url]`.
It asks a few real questions (paid model calls), rebuilds from the streamed
events the stages the dive shows (guardrails, each model call, each tool
call), and checks that the request's Langfuse trace has exactly those spans,
with the same tokens and cost, and that no span carries input or output (D4).
"""

import asyncio
import json
import sys
import time
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel, Field

from app.config import get_settings
from app.emitter import tool_type
from app.events import (
    GuardrailsChecked,
    LlmCompleted,
    LlmStarted,
    RequestFinished,
    StreamEvent,
    ToolCalled,
)
from app.tracing import langfuse_target

QUESTIONS = (
    "What does Eliyahu do at Phytech?",
    "מה הוא בנה בגיברס?",
    "What is the capital of Australia?",
)
# Cloudflare's test secret (the local default) accepts any token.
_TEST_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"
# Langfuse ingests asynchronously; a trace can take a while to show up.
_TRACE_WAIT_S = 90
_POLL_S = 5


@dataclass(frozen=True, order=True)
class Stage:
    """One stage of a request: a span in the trace, a step in the dive."""

    name: str
    kind: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0


class Observation(BaseModel):
    """The fields of a Langfuse observation the gate compares."""

    id: str
    trace_id: str = Field(alias="traceId")
    name: str
    type: str
    parent: str | None = Field(default=None, alias="parentObservationId")
    input: object = None
    output: object = None
    usage: dict[str, int] = Field(default_factory=dict, alias="usageDetails")
    cost: dict[str, float] = Field(default_factory=dict, alias="costDetails")
    metadata: dict[str, object] = Field(default_factory=dict)


def stream_events(body: str) -> list[StreamEvent]:
    """The pipeline events in an /api/chat response body."""
    events = []
    for line in body.splitlines():
        payload = line.removeprefix("data: ")
        if not payload.startswith("{"):
            continue
        chunk = json.loads(payload)
        if chunk.get("type") == "data-event":
            events.append(StreamEvent.model_validate(chunk["data"]))
    return events


def dive_stages(events: list[StreamEvent]) -> list[Stage]:
    """The stages the dive shows for these events, in a comparable order."""
    stages: list[Stage] = []
    calls: dict[int, Stage] = {}
    for stamped in events:
        match stamped.event:
            case GuardrailsChecked():
                stages.append(Stage("guardrails", "guardrail"))
            case LlmStarted(call=call):
                calls[call] = Stage(f"model call {call}", "generation")
            case LlmCompleted() as done:
                calls[done.call] = Stage(
                    f"model call {done.call}",
                    "generation",
                    done.input_tokens,
                    done.output_tokens,
                    round(done.cost_usd, 9),
                )
            case ToolCalled(tool=tool):
                stages.append(Stage(tool, tool_type(tool)))
    return sorted([*stages, *calls.values()])


def trace_stages(observations: list[Observation], root: str) -> list[Stage]:
    """The stage spans under the request's root span, in a comparable order."""
    return sorted(
        Stage(
            o.name,
            o.type.lower(),
            o.usage.get("input", 0),
            o.usage.get("output", 0),
            round(o.cost.get("total", 0.0), 9),
        )
        for o in observations
        if o.parent == root
    )


def differences(dive: list[Stage], traced: list[Stage]) -> list[str]:
    """What one side has that the other doesn't (empty when they match)."""
    only_dive = Counter(dive) - Counter(traced)
    only_trace = Counter(traced) - Counter(dive)
    return [f"in the dive only: {s}" for s in only_dive.elements()] + [
        f"in the trace only: {s}" for s in only_trace.elements()
    ]


def leaks(observations: list[Observation]) -> list[str]:
    """Spans that carry input or output, which must never happen (D4)."""
    return [
        f"{o.name} carries input/output"
        for o in observations
        if o.input is not None or o.output is not None
    ]


async def _ask(client: httpx.AsyncClient, api: str, question: str) -> str:
    session = await client.post(
        f"{api}/api/session", json={"turnstile_token": _TEST_TURNSTILE_TOKEN}
    )
    chat = await client.post(
        f"{api}/api/chat",
        json={
            "question": question,
            "session": session.raise_for_status().json()["session"],
        },
        timeout=120,
    )
    return chat.raise_for_status().text


async def _observations(
    client: httpx.AsyncClient, url: str, headers: dict[str, str], **params: str
) -> list[Observation]:
    response = await client.get(url, headers=headers, params={**params, "limit": "100"})
    data = response.raise_for_status().json()["data"]
    return [Observation.model_validate(o) for o in data]


async def _trace(
    client: httpx.AsyncClient, url: str, headers: dict[str, str], request_id: str
) -> tuple[str, list[Observation]] | None:
    """The request's root span id and every observation in its trace."""
    since = (datetime.now(UTC) - timedelta(minutes=10)).isoformat()
    deadline = time.monotonic() + _TRACE_WAIT_S
    while time.monotonic() < deadline:
        roots = await _observations(
            client,
            url,
            headers,
            name="chat",
            fromStartTime=since,
            fields="core,basic,metadata",
        )
        for root in roots:
            if root.metadata.get("attributes.request_id") == request_id:
                return root.id, await _observations(
                    client,
                    url,
                    headers,
                    traceId=root.trace_id,
                    fields="core,basic,io,usage",
                )
        await asyncio.sleep(_POLL_S)
    return None


async def main(api: str) -> int:
    settings = get_settings()
    target = langfuse_target(settings)
    if target is None:
        print("Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY first.")
        return 1
    _, headers = target
    url = f"{settings.langfuse_base_url.rstrip('/')}/api/public/v2/observations"
    passed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        for question in QUESTIONS:
            events = stream_events(await _ask(client, api, question))
            outcome = next(
                (
                    e.event.outcome
                    for e in events
                    if isinstance(e.event, RequestFinished)
                ),
                "unfinished",
            )
            dive = dive_stages(events)
            found = await _trace(client, url, headers, events[0].request_id)
            if found is None:
                problems = ["no trace in Langfuse"]
            else:
                root, observations = found
                problems = differences(dive, trace_stages(observations, root))
                problems += leaks(observations)
            mark = "✗" if problems else "✓"
            print(f"{mark} {outcome} · {', '.join(s.name for s in dive)}")
            for problem in problems:
                print(f"    {problem}")
            passed += not problems
    print(f"{passed}/{len(QUESTIONS)} requests: dive == Langfuse trace")
    return 0 if passed == len(QUESTIONS) else 1


if __name__ == "__main__":
    sys.exit(
        asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"))
    )
