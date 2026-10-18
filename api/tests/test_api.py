import json

from fastapi.testclient import TestClient

from app.main import app, get_github, get_retriever
from tests.fakes import StubRetriever, fake_github

app.dependency_overrides[get_retriever] = lambda: StubRetriever([])
app.dependency_overrides[get_github] = fake_github
client = TestClient(app)


def test_chat_streams_server_sent_events() -> None:
    with client.stream(
        "POST", "/api/chat", json={"question": "Where does Eliyahu work?"}
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
