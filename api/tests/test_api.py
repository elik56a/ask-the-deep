import json

import httpx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.control.session import Turnstile
from app.main import app, get_services, get_turnstile
from tests.fakes import StubRetriever, make_services


def _cloudflare(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={"success": b"response=good" in request.content})


app.dependency_overrides[get_services] = lambda: make_services(StubRetriever([]))
app.dependency_overrides[get_turnstile] = lambda: Turnstile(
    httpx.AsyncClient(transport=httpx.MockTransport(_cloudflare)), "secret"
)
client = TestClient(app)


def test_chat_streams_server_sent_events() -> None:
    with client.stream(
        "POST",
        "/api/chat",
        json={
            "question": "And what does he do there?",
            "history": [
                {"role": "user", "text": "Where does Eliyahu work?"},
                {"role": "assistant", "text": "At Phytech."},
            ],
        },
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = [
            json.loads(line[6:])
            for line in response.iter_lines()
            if line.startswith("data: ")
        ]
    assert events[0]["event"]["type"] == "request.started"
    assert events[-1]["event"]["type"] == "request.finished"


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
    with client.stream(
        "POST", "/api/chat", json={"question": "Hi", "session": session}
    ) as response:
        last = [line for line in response.iter_lines() if line.startswith("data: ")][-1]
    return str(json.loads(last[6:])["event"]["outcome"])


def test_a_human_gets_a_session_that_unlocks_the_chat() -> None:
    status, body = _session("good")
    assert status == 200
    assert body["expires_in"] == Settings().session_ttl_seconds
    assert _chat_outcome(str(body["session"])) != "blocked"


def test_a_failed_human_check_gets_no_session() -> None:
    assert _session("bad")[0] == 403


def test_chat_without_a_session_is_blocked() -> None:
    assert _chat_outcome("") == "blocked"
