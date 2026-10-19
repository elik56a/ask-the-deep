"""Event schema: the single source of truth for the stream, the traces and the TS types.

Public by construction: no field may carry the system prompt, keys, IPs or the budget.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class _Model(BaseModel):
    model_config = ConfigDict(
        extra="forbid", frozen=True, json_schema_serialization_defaults_required=True
    )


class GuardrailCheck(_Model):
    name: str
    passed: bool


class ScoredPassage(_Model):
    chunk_id: str
    breadcrumb: str
    score: float
    above_threshold: bool


class Citation(_Model):
    chunk_id: str
    source: str
    breadcrumb: str
    excerpt: str


class RequestStarted(_Model):
    type: Literal["request.started"] = "request.started"
    model: str
    provider: str
    rules_version: str


class GuardrailsChecked(_Model):
    type: Literal["guardrails.checked"] = "guardrails.checked"
    checks: list[GuardrailCheck]


class CacheChecked(_Model):
    type: Literal["cache.checked"] = "cache.checked"
    hit: bool
    similarity: float | None = None


class LlmStarted(_Model):
    type: Literal["llm.started"] = "llm.started"
    call: int


class LlmCompleted(_Model):
    """One model call: who answered, what it cost, and what it decided."""

    type: Literal["llm.completed"] = "llm.completed"
    call: int
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    duration_ms: int
    decision: Literal["tools", "answer", "text"]
    tools: list[str]
    fallback: bool
    rejected: str | None


class ToolCalled(_Model):
    type: Literal["tool.called"] = "tool.called"
    tool: str
    args: dict[str, str]


class ToolCompleted(_Model):
    type: Literal["tool.completed"] = "tool.completed"
    tool: str
    ok: bool
    result_count: int
    duration_ms: int


class RetrievalStarted(_Model):
    type: Literal["retrieval.started"] = "retrieval.started"
    query: str


class RetrievalCompleted(_Model):
    type: Literal["retrieval.completed"] = "retrieval.completed"
    passages: list[ScoredPassage]
    threshold: float


class DecisionMade(_Model):
    type: Literal["decision.made"] = "decision.made"
    action: Literal["answer", "no_information"]
    reason: str
    best_score: float
    threshold: float


class GenerationStarted(_Model):
    type: Literal["generation.started"] = "generation.started"
    context_chunks: int
    prompt_cache_hit: bool


class TextDelta(_Model):
    type: Literal["text.delta"] = "text.delta"
    text: str


class CitationsAttached(_Model):
    type: Literal["citations.attached"] = "citations.attached"
    citations: list[Citation]


class UsageReported(_Model):
    type: Literal["usage.reported"] = "usage.reported"
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    cost_usd: float
    latency_ms: int
    ttft_ms: int | None


class ErrorEvent(_Model):
    type: Literal["error"] = "error"
    code: str
    message: str


class RequestFinished(_Model):
    type: Literal["request.finished"] = "request.finished"
    outcome: Literal["answered", "no_information", "blocked", "error"]


Event = Annotated[
    RequestStarted
    | GuardrailsChecked
    | CacheChecked
    | LlmStarted
    | LlmCompleted
    | ToolCalled
    | ToolCompleted
    | RetrievalStarted
    | RetrievalCompleted
    | DecisionMade
    | GenerationStarted
    | TextDelta
    | CitationsAttached
    | UsageReported
    | ErrorEvent
    | RequestFinished,
    Field(discriminator="type"),
]


class StreamEvent(_Model):
    request_id: str
    seq: int
    t_ms: int
    event: Event
