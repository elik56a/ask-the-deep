// Generated from api/app/events.py by `pnpm gen:events`. Do not edit.

export interface StreamEvent {
  request_id: string;
  seq: number;
  t_ms: number;
  event:
    | RequestStarted
    | GuardrailsChecked
    | CacheChecked
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
    | RequestFinished;
}
export interface RequestStarted {
  type: "request.started";
  model: string;
  provider: string;
  rules_version: string;
}
export interface GuardrailsChecked {
  type: "guardrails.checked";
  checks: GuardrailCheck[];
}
export interface GuardrailCheck {
  name: string;
  passed: boolean;
}
export interface CacheChecked {
  type: "cache.checked";
  hit: boolean;
  similarity: number | null;
}
export interface ToolCalled {
  type: "tool.called";
  tool: string;
  args: {
    [k: string]: string;
  };
}
export interface ToolCompleted {
  type: "tool.completed";
  tool: string;
  ok: boolean;
  result_count: number;
  duration_ms: number;
}
export interface RetrievalStarted {
  type: "retrieval.started";
  query: string;
}
export interface RetrievalCompleted {
  type: "retrieval.completed";
  passages: ScoredPassage[];
  threshold: number;
}
export interface ScoredPassage {
  chunk_id: string;
  breadcrumb: string;
  score: number;
  above_threshold: boolean;
}
export interface DecisionMade {
  type: "decision.made";
  action: "answer" | "no_information";
  reason: string;
  best_score: number;
  threshold: number;
}
export interface GenerationStarted {
  type: "generation.started";
  context_chunks: number;
  prompt_cache_hit: boolean;
}
export interface TextDelta {
  type: "text.delta";
  text: string;
}
export interface CitationsAttached {
  type: "citations.attached";
  citations: Citation[];
}
export interface Citation {
  chunk_id: string;
  source: string;
  breadcrumb: string;
  excerpt: string;
}
export interface UsageReported {
  type: "usage.reported";
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  latency_ms: number;
  ttft_ms: number | null;
}
export interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
}
export interface RequestFinished {
  type: "request.finished";
  outcome: "answered" | "no_information" | "blocked" | "error";
}
