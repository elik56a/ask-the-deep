from typing import get_args

import pytest

from app.events import (
    CacheChecked,
    Citation,
    CitationsAttached,
    DecisionMade,
    ErrorEvent,
    Event,
    GenerationStarted,
    GuardrailCheck,
    GuardrailsChecked,
    RequestFinished,
    RequestStarted,
    RetrievalCompleted,
    RetrievalStarted,
    ScoredPassage,
    StreamEvent,
    TextDelta,
    UsageReported,
)

SAMPLES: list[Event] = [
    RequestStarted(model="m", provider="p", rules_version="v1"),
    GuardrailsChecked(checks=[GuardrailCheck(name="input_length", passed=True)]),
    CacheChecked(hit=False),
    RetrievalStarted(query="q"),
    RetrievalCompleted(
        passages=[
            ScoredPassage(
                chunk_id="a#0", breadcrumb="A › B", score=0.5, above_threshold=True
            )
        ],
        threshold=0.3,
    ),
    DecisionMade(action="answer", reason="r", best_score=0.5, threshold=0.3),
    GenerationStarted(context_chunks=1, prompt_cache_hit=False),
    TextDelta(text="hi"),
    CitationsAttached(
        citations=[
            Citation(chunk_id="a#0", source="a.md", breadcrumb="A › B", excerpt="x")
        ]
    ),
    UsageReported(
        input_tokens=1,
        output_tokens=1,
        cached_tokens=0,
        cost_usd=0.0,
        latency_ms=1,
        ttft_ms=1,
    ),
    ErrorEvent(code="c", message="m"),
    RequestFinished(outcome="answered"),
]


def test_samples_cover_every_event_type() -> None:
    event_union, _ = get_args(Event)
    assert len({type(e) for e in SAMPLES}) == len(get_args(event_union))


@pytest.mark.parametrize("event", SAMPLES, ids=lambda e: e.type)
def test_round_trip(event: Event) -> None:
    stamped = StreamEvent(request_id="r", seq=0, t_ms=0, event=event)
    assert StreamEvent.model_validate_json(stamped.model_dump_json()) == stamped


def test_schema_has_no_private_fields() -> None:
    schema = str(StreamEvent.model_json_schema()).lower()
    for forbidden in ("system_prompt", "api_key", "secret", "ip_address", "budget"):
        assert forbidden not in schema
