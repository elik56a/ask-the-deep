import json

from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.main import app, get_services
from tests.fakes import StubRetriever, make_services

app.dependency_overrides[get_services] = lambda: make_services(StubRetriever([]))
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
