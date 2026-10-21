"""D4: the visitor's question and the answer never reach logs, traces or DynamoDB."""

import pytest
from mypy_boto3_dynamodb.service_resource import Table
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import (
    InMemorySpanExporter,
)
from structlog.testing import capture_logs

from app import emitter
from app.agent.chat_agent import agent
from app.config import Settings
from app.control.budget import DynamoBudget
from app.control.rate_limit import DynamoRateLimiter
from app.control.stats import DynamoStats
from app.pipeline import Services, run_pipeline
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, fake_github, make_chunk, scripted

QUESTION = "Does he like zebra-kumquat pizza?"
QUERY = "zebra-kumquat preferences"
ANSWER = "He loves xylophone-marmalade."
SETTINGS = Settings()
SECRETS = ("zebra", "kumquat", "xylophone", "marmalade")


async def test_no_conversation_text_in_logs_traces_or_dynamodb(
    counters: Table,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    spans = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(spans))
    monkeypatch.setattr(emitter, "_tracer", provider.get_tracer("test"))
    retriever = StubRetriever(
        [Hit(make_chunk("food", "Eliyahu's food notes"), 0.9, 0.03)]
    )
    services = Services(
        retriever=retriever,
        github=fake_github(),
        limiter=DynamoRateLimiter(counters, limit=5),
        budget=DynamoBudget(counters, SETTINGS),
        stats=DynamoStats(counters),
    )
    model = scripted(
        ("search_knowledge", {"query": QUERY}),
        ("answer", {"kind": "answered", "citations": ["food"], "text": ANSWER}),
    )

    with capture_logs() as logs, agent.override(model=model):
        events = [
            e
            async for e in run_pipeline(
                QUESTION, SETTINGS, services, "visitor-hash", "session-1"
            )
        ]

    streamed = "".join(
        e.event.model_dump()["text"] for e in events if e.event.type == "text.delta"
    )
    assert ANSWER in streamed  # the browser does get the answer
    finished = spans.get_finished_spans()
    traces = [s.attributes for s in finished] + [
        e.attributes for s in finished for e in s.events
    ]
    stored = counters.scan()["Items"]
    assert logs
    assert finished
    assert stored
    for place, content in {
        "logs": str(logs) + caplog.text,
        "traces": str(traces) + str([s.name for s in finished]),
        "dynamodb": str(stored),
    }.items():
        for word in SECRETS:
            assert word not in content.lower(), f"{word!r} reached {place}"
