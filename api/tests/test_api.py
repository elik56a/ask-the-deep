import json

import httpx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.control.session import Turnstile
from app.events import StreamEvent
from app.main import app, get_services, get_turnstile
from tests.fakes import StubRetriever, make_services


def _cloudflare(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={"success": b"response=good" in request.content})


app.dependency_overrides[get_services] = lambda: make_services(StubRetriever([]))
app.dependency_overrides[get_turnstile] = lambda: Turnstile(
    httpx.AsyncClient(transport=httpx.MockTransport(_cloudflare)), "secret"
)
client = TestClient(app)
Part = dict[str, object]


def _chat(body: dict[str, object]) -> tuple[dict[str, str], list[Part]]:
    """POST a question; return the headers and the stream's parts (without [DONE])."""
    with client.stream("POST", "/api/chat", json=body) as response:
        assert response.status_code == 200
        lines = [
            line[6:] for line in response.iter_lines() if line.startswith("data: ")
        ]
        headers = dict(response.headers)
    assert lines[-1] == "[DONE]"
    return headers, [json.loads(line) for line in lines[:-1]]


def _events(parts: list[Part]) -> list[dict[str, object]]:
    """Our events, parsed back from the data parts (which also checks the schema)."""
    return [
        StreamEvent.model_validate(p["data"]).event.model_dump()
        for p in parts
        if p["type"] == "data-event"
    ]


def test_chat_streams_in_the_ai_sdk_format() -> None:
    headers, parts = _chat(
        {
            "question": "And what does he do there?",
            "history": [
                {"role": "user", "text": "Where does Eliyahu work?"},
                {"role": "assistant", "text": "At Phytech."},
            ],
        }
    )
    assert headers["content-type"].startswith("text/event-stream")
    assert headers["x-vercel-ai-ui-message-stream"] == "v1"
    assert parts[0]["type"] == "start"
    assert parts[-1]["type"] == "finish"
    events = _events(parts)
    assert events[0]["type"] == "request.started"
    assert events[-1]["type"] == "request.finished"


def test_stats_are_public_and_anonymous() -> None:
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=60"
    assert set(response.json()) == {
        "month",
        "questions",
        "avg_cost_usd",
        "avg_latency_ms",
        "no_info_rate",
    }


def test_health() -> None:
    assert client.get("/api/health").json() == {
        "status": "ok",
        "corpus_version": "stub-version",
    }


def test_refuses_requests_that_skip_cloudfront() -> None:
    secret = Settings(origin_verify_secret=SecretStr("s3cret"))
    app.dependency_overrides[get_settings] = lambda: secret
    try:
        assert client.get("/api/health").status_code == 403
        allowed = client.get("/api/health", headers={"x-origin-verify": "s3cret"})
        assert allowed.status_code == 200
    finally:
        del app.dependency_overrides[get_settings]


def _session(turnstile_token: str) -> tuple[int, dict[str, str | int]]:
    response = client.post("/api/session", json={"turnstile_token": turnstile_token})
    return response.status_code, response.json()


def _chat_outcome(session: str) -> str:
    _, parts = _chat({"question": "Hi", "session": session})
    return str(_events(parts)[-1]["outcome"])


def test_a_human_gets_a_session_that_unlocks_the_chat() -> None:
    status, body = _session("good")
    assert status == 200
    assert body["expires_in"] == Settings().session_ttl_seconds
    assert _chat_outcome(str(body["session"])) != "blocked"


def test_a_failed_human_check_gets_no_session() -> None:
    assert _session("bad")[0] == 403


def test_chat_without_a_session_is_blocked() -> None:
    assert _chat_outcome("") == "blocked"
