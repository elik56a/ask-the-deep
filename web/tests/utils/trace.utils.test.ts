import { expect, it } from "vitest";
import type { LlmCompleted, StreamEvent } from "#/generated/events.gen";
import { buildTrace, rulerTicks } from "#/utils/trace.utils";

it("picks a round ruler step with at most six marks", () => {
  expect(rulerTicks(2910)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
  expect(rulerTicks(220)).toEqual([0, 50, 100, 150, 200]);
});

function at(t_ms: number, event: StreamEvent["event"]): StreamEvent {
  return { request_id: "r1", seq: 0, t_ms, event };
}

const llmCompleted = (call: number, cost: number): LlmCompleted => ({
  type: "llm.completed",
  call,
  model: "gemini",
  input_tokens: 100,
  output_tokens: 10,
  cost_usd: cost,
  duration_ms: 5,
  decision: call === 1 ? "tools" : "answer",
  tools: [],
  fallback: false,
  rejected: null,
});

const start = [
  at(0, {
    type: "guardrails.checked",
    checks: [{ name: "rate_limit", passed: true }],
  }),
  at(10, { type: "llm.started", call: 1 }),
  at(800, llmCompleted(1, 0.0001)),
  at(801, {
    type: "tool.called",
    tool: "search_knowledge",
    args: { query: "skills" },
  }),
];

const finish = [
  at(1040, {
    type: "retrieval.completed",
    threshold: 0.3,
    passages: [
      {
        chunk_id: "skills.md#a",
        breadcrumb: "A",
        score: 0.8,
        above_threshold: true,
      },
      {
        chunk_id: "skills.md#b",
        breadcrumb: "B",
        score: 0.2,
        above_threshold: false,
      },
    ],
  }),
  at(1040, {
    type: "tool.completed",
    tool: "search_knowledge",
    ok: true,
    result_count: 1,
    duration_ms: 239,
  }),
  at(1050, { type: "llm.started", call: 2 }),
  at(1051, {
    type: "generation.started",
    context_chunks: 1,
    prompt_cache_hit: false,
  }),
  at(2900, llmCompleted(2, 0.0002)),
  at(2905, {
    type: "usage.reported",
    input_tokens: 999,
    output_tokens: 99,
    cached_tokens: 0,
    cost_usd: 0.0005,
    latency_ms: 2910,
    ttft_ms: 1590,
  }),
  at(2910, { type: "request.finished", outcome: "answered" }),
];

it("marks the stages that are still running mid-request", () => {
  const trace = buildTrace(start);

  expect(trace.activeStages).toEqual(["tool"]);
  expect(trace.outcome).toBeNull();
  expect(trace.lastMs).toBe(801);
  expect(trace.totals).toMatchObject({
    modelCalls: 1,
    inputTokens: 100,
    outputTokens: 10,
    costUsd: 0.0001,
  });
});

it("closes every span and takes the server's totals at the end", () => {
  const trace = buildTrace([...start, ...finish]);

  expect(trace.spans).toEqual([
    { stage: "guard", start: 0, end: 0 },
    { stage: "llm", call: 1, start: 10, end: 800 },
    { stage: "tool", tool: "search_knowledge", start: 801, end: 1040 },
    { stage: "llm", call: 2, start: 1050, end: 2900 },
    { stage: "stream", start: 1051, end: 2910 },
  ]);
  expect(trace.activeStages).toEqual([]);
  expect(trace.outcome).toBe("answered");
  expect(trace.totals).toEqual({
    modelCalls: 2,
    inputTokens: 999,
    outputTokens: 99,
    costUsd: 0.0005,
    ttftMs: 1590,
    latencyMs: 2910,
  });
});

it("keeps only passages that passed the gate as retrieved", () => {
  expect(buildTrace([...start, ...finish]).retrieved).toEqual(["skills.md#a"]);
});

it("returns an empty trace before any event", () => {
  const trace = buildTrace([]);

  expect(trace.spans).toEqual([]);
  expect(trace.totals.modelCalls).toBe(0);
  expect(trace.outcome).toBeNull();
});
