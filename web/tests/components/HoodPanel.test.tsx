import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HoodPanel } from "#/components/HoodPanel";
import type { StreamEvent } from "#/generated/events.gen";

const run: StreamEvent["event"][] = [
  {
    type: "request.started",
    model: "gemini",
    provider: "google",
    rules_version: "v2",
  },
  {
    type: "guardrails.checked",
    checks: [{ name: "rate_limit", passed: true }],
  },
  { type: "llm.started", call: 1 },
  {
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
  { type: "tool.called", tool: "search_knowledge", args: { query: "skills" } },
  {
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
  {
    type: "tool.completed",
    tool: "search_knowledge",
    ok: true,
    result_count: 1,
    duration_ms: 233,
  },
  {
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
  {
    type: "usage.reported",
    input_tokens: 3650,
    output_tokens: 134,
    cached_tokens: 0,
    cost_usd: 0.000419,
    latency_ms: 2910,
    ttft_ms: 1590,
  },
  { type: "request.finished", outcome: "answered" },
];
const events: StreamEvent[] = run.map((event, seq) => ({
  request_id: "r1",
  seq,
  t_ms: seq * 100,
  event,
}));

const render = (items: StreamEvent[], running: boolean) =>
  renderToStaticMarkup(
    <HoodPanel
      lang="en"
      events={items}
      running={running}
      focusChunk={null}
      onFocusChunk={() => {}}
    />,
  );

it("shows a finished run: totals, decision, gate and citation check", () => {
  const html = render(events, false);

  expect(html).toContain("Answered");
  expect(html).toContain("2.910");
  expect(html).toContain("3,650 / 134");
  expect(html).toContain("$0.000419");
  expect(html).toContain("Decided → call");
  expect(html).toContain("1 reach the model");
  expect(html).toContain("1 blocked below the gate");
  expect(html).toContain("1/1 cited passages were retrieved in this run");
});

it("shows a waiting state before the first event", () => {
  const html = render([], true);

  expect(html).toContain("Running");
  expect(html).toContain("Waiting for the first event.");
});
