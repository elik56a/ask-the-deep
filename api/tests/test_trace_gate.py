from app.events import (
    GuardrailCheck,
    GuardrailsChecked,
    LlmCompleted,
    LlmStarted,
    RequestFinished,
    StreamEvent,
    TextDelta,
    ToolCalled,
)
from app.trace_gate import (
    Observation,
    Stage,
    differences,
    dive_stages,
    leaks,
    stream_events,
    trace_stages,
)

EVENTS = [
    GuardrailsChecked(checks=[GuardrailCheck(name="rate_limit", passed=True)]),
    LlmStarted(call=1),
    LlmCompleted(
        call=1,
        model="m",
        input_tokens=800,
        output_tokens=20,
        cost_usd=0.0003,
        duration_ms=900,
        decision="tools",
        tools=["search_knowledge", "contact_info"],
        fallback=False,
        rejected=None,
    ),
    ToolCalled(tool="search_knowledge", args={"query": "x"}),
    ToolCalled(tool="contact_info", args={}),
    LlmStarted(call=2),
    TextDelta(text="Hi"),
    RequestFinished(outcome="error"),
]
DIVE = [
    Stage("contact_info", "tool"),
    Stage("guardrails", "guardrail"),
    Stage("model call 1", "generation", 800, 20, 0.0003),
    Stage("model call 2", "generation"),
    Stage("search_knowledge", "retriever"),
]


def _stream(events: list[StreamEvent]) -> str:
    lines = ['data: {"type":"start","messageId":"r1"}']
    for e in events:
        lines.append(f'data: {{"type":"data-event","data":{e.model_dump_json()}}}')
    return "\n\n".join([*lines, 'data: {"type":"finish"}', "data: [DONE]"])


def _observation(
    name: str, kind: str, parent: str | None = "root", **extra: object
) -> Observation:
    return Observation.model_validate(
        {
            "id": name,
            "traceId": "t",
            "name": name,
            "type": kind,
            "parentObservationId": parent,
        }
        | extra
    )


def test_reads_the_events_out_of_the_chat_stream() -> None:
    stamped = [
        StreamEvent(request_id="r1", seq=i, t_ms=i, event=e)
        for i, e in enumerate(EVENTS)
    ]
    assert stream_events(_stream(stamped)) == stamped


def test_the_dive_has_one_stage_per_check_model_call_and_tool() -> None:
    stamped = [
        StreamEvent(request_id="r1", seq=i, t_ms=i, event=e)
        for i, e in enumerate(EVENTS)
    ]
    assert dive_stages(stamped) == DIVE


def test_only_spans_under_the_request_count_as_stages() -> None:
    observations = [
        _observation("chat", "SPAN", parent="http"),
        _observation("POST /api/chat", "SPAN", parent=None),
        _observation("guardrails", "GUARDRAIL"),
        _observation(
            "model call 1",
            "GENERATION",
            usageDetails={"input": 800, "output": 20, "total": 820},
            costDetails={"total": 0.0003},
        ),
        _observation("model call 2", "GENERATION"),
        _observation("search_knowledge", "RETRIEVER"),
        _observation("contact_info", "TOOL"),
    ]
    assert trace_stages(observations, "root") == DIVE
    assert differences(DIVE, trace_stages(observations, "root")) == []


def test_reports_what_each_side_is_missing() -> None:
    traced = [*DIVE[1:], Stage("get_project", "tool")]
    assert differences(DIVE, traced) == [
        "in the dive only: " + str(DIVE[0]),
        "in the trace only: " + str(Stage("get_project", "tool")),
    ]


def test_flags_any_span_with_input_or_output() -> None:
    observations = [
        _observation("guardrails", "GUARDRAIL"),
        _observation("model call 1", "GENERATION", output="the answer"),
    ]
    assert leaks(observations) == ["model call 1 carries input/output"]
