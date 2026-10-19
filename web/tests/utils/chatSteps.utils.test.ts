import { expect, it } from "vitest";
import type { StreamEvent } from "#/generated/events.gen";
import { chatSteps } from "#/utils/chatSteps.utils";

function at(event: StreamEvent["event"]): StreamEvent {
  return { request_id: "r1", seq: 0, t_ms: 0, event };
}

const checked = (passed: boolean) =>
  at({
    type: "guardrails.checked",
    checks: [{ name: "rate_limit", passed }],
  });
const searching = at({
  type: "tool.called",
  tool: "search_knowledge",
  args: { query: "AWS" },
});
const found = (result_count: number, ok = true) =>
  at({
    type: "tool.completed",
    tool: "search_knowledge",
    ok,
    result_count,
    duration_ms: 200,
  });
const writing = at({
  type: "generation.started",
  context_chunks: 2,
  prompt_cache_hit: false,
});
const finished = (outcome: "answered" | "no_information" | "error") =>
  at({ type: "request.finished", outcome });

it("shows a running step while a tool works", () => {
  expect(chatSteps([checked(true), searching], "en")).toEqual([
    { id: "guard", label: "Checked your question", state: "done" },
    {
      id: "tool-1",
      label: `Searching Eliyahu's knowledge for "AWS"…`,
      state: "running",
    },
  ]);
});

it("ends an answered request with every step done", () => {
  const steps = chatSteps(
    [checked(true), searching, found(3), writing, finished("answered")],
    "en",
  );

  expect(steps.map((step) => [step.label, step.state])).toEqual([
    ["Checked your question", "done"],
    ["Found 3 relevant passages", "done"],
    ["Answer written", "done"],
  ]);
});

it("marks an empty search and a no-information answer", () => {
  const steps = chatSteps(
    [checked(true), searching, found(0), writing, finished("no_information")],
    "en",
  );

  expect(steps.map((step) => step.state)).toEqual(["done", "empty", "empty"]);
  expect(steps.at(-1)?.label).toBe("Not in Eliyahu's notes");
});

it("fails the running step when the request errors", () => {
  const steps = chatSteps([checked(true), searching, finished("error")], "en");

  expect(steps.at(-1)).toMatchObject({ id: "tool-1", state: "failed" });
});

it("adds a stopped step when nothing was running at the error", () => {
  const steps = chatSteps([checked(true), finished("error")], "en");

  expect(steps.at(-1)).toEqual({
    id: "stopped",
    label: "Stopped before finishing",
    state: "failed",
  });
});

it("reports a blocked question as a failed safety check", () => {
  expect(chatSteps([checked(false)], "en")[0]).toMatchObject({
    state: "failed",
    label: "A safety check stopped this question",
  });
});

it("labels steps in Hebrew", () => {
  expect(chatSteps([checked(true)], "he")[0]?.label).toBe("השאלה נבדקה");
});
