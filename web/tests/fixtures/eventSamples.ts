import type { StreamEvent } from "#/generated/events.gen";

type EventOf<K> = Extract<StreamEvent["event"], { type: K }>;

// One of every event type; the mapped type fails to compile when events.gen.ts gains one.
export const EVENT_SAMPLES: {
  [K in StreamEvent["event"]["type"]]: EventOf<K>;
} = {
  "request.started": {
    type: "request.started",
    model: "gemini",
    provider: "google",
    rules_version: "v2",
  },
  "guardrails.checked": {
    type: "guardrails.checked",
    checks: [
      { name: "rate_limit", passed: true },
      { name: "topic", passed: true },
    ],
  },
  "cache.checked": { type: "cache.checked", hit: false, similarity: null },
  "llm.started": { type: "llm.started", call: 1 },
  "llm.completed": {
    type: "llm.completed",
    call: 1,
    model: "gemini",
    input_tokens: 1240,
    output_tokens: 38,
    cost_usd: 0.000139,
    duration_ms: 803,
    decision: "tools",
    tools: ["search_knowledge"],
    fallback: false,
    rejected: null,
  },
  "tool.called": {
    type: "tool.called",
    tool: "search_knowledge",
    args: { query: "skills" },
  },
  "tool.completed": {
    type: "tool.completed",
    tool: "search_knowledge",
    ok: true,
    result_count: 1,
    duration_ms: 233,
  },
  "retrieval.started": { type: "retrieval.started", query: "skills" },
  "retrieval.completed": {
    type: "retrieval.completed",
    threshold: 0.3,
    passages: [
      {
        chunk_id: "skills.md#a",
        breadcrumb: "Skills › A",
        score: 0.81,
        above_threshold: true,
      },
      {
        chunk_id: "skills.md#b",
        breadcrumb: "Skills › B",
        score: 0.19,
        above_threshold: false,
      },
    ],
  },
  "decision.made": {
    type: "decision.made",
    action: "answer",
    reason: "best passage clears the gate",
    best_score: 0.81,
    threshold: 0.3,
  },
  "generation.started": {
    type: "generation.started",
    context_chunks: 1,
    prompt_cache_hit: false,
  },
  "text.delta": { type: "text.delta", text: "React" },
  "citations.attached": {
    type: "citations.attached",
    citations: [
      {
        chunk_id: "skills.md#a",
        source: "skills.md",
        breadcrumb: "Skills › A",
        excerpt: "React.",
      },
    ],
  },
  "usage.reported": {
    type: "usage.reported",
    input_tokens: 3650,
    output_tokens: 134,
    cached_tokens: 0,
    cost_usd: 0.000419,
    latency_ms: 2910,
    ttft_ms: 1590,
  },
  error: { type: "error", code: "generation_failed", message: "Try again." },
  "request.finished": { type: "request.finished", outcome: "answered" },
};

export function stream(events: StreamEvent["event"][]): StreamEvent[] {
  return events.map((event, seq) => ({
    request_id: "r1",
    seq,
    t_ms: seq * 100,
    event,
  }));
}
