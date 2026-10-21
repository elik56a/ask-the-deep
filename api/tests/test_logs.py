import json
import logging
from collections.abc import Iterator

import pytest
import structlog

from app.emitter import Emitter
from app.events import RequestFinished, RetrievalStarted
from app.logs import configure_logging


@pytest.fixture(autouse=True)
def reset_logging() -> Iterator[None]:
    yield
    structlog.reset_defaults()
    logging.getLogger("uvicorn.access").disabled = False


def test_json_logs_carry_request_stage_and_outcome(
    capsys: pytest.CaptureFixture[str],
) -> None:
    configure_logging(json_logs=True)
    em = Emitter("r1")
    em.emit(RetrievalStarted(query="where does he live"))
    em.emit(RequestFinished(outcome="answered"))

    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    assert [line["event"] for line in lines] == [
        "retrieval.started",
        "request.finished",
    ]
    assert all(line["request_id"] == "r1" for line in lines)
    assert [line["stage"] for line in lines] == ["retrieval", "request"]
    assert lines[1]["outcome"] == "answered"
    assert "where does he live" not in str(lines)


def test_production_logs_drop_the_access_log_with_ips() -> None:
    configure_logging(json_logs=True)
    assert logging.getLogger("uvicorn.access").disabled
    configure_logging(json_logs=False)
    assert not logging.getLogger("uvicorn.access").disabled
