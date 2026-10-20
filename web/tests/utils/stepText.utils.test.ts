import { describe, expect, it } from "vitest";
import { DIVE_COPY, EVENTS_WITHOUT_STEP } from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import { diveSteps } from "#/utils/depth.utils";
import { stepText } from "#/utils/stepText.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const copy = DIVE_COPY.en.steps;
const text = (...events: StreamEvent["event"][]) => {
  const step = diveSteps(stream(events)).at(-1);
  if (!step) throw new Error("no step");
  return stepText(step, copy);
};

describe("every event type", () => {
  for (const event of Object.values(EVENT_SAMPLES)) {
    it(`${event.type} adds a step with a title, or is listed as having none`, () => {
      const steps = diveSteps(stream([event]));
      if (EVENTS_WITHOUT_STEP.includes(event.type)) {
        expect(steps).toHaveLength(0);
      } else {
        expect(steps).toHaveLength(1);
        expect(stepText(steps[0], copy).title).not.toBe("");
      }
    });
  }
});

it("says the question reached the server", () => {
  expect(text(EVENT_SAMPLES["request.started"]).title).toBe(
    "Your question reached the server",
  );
});

it("counts safety checks, and says when they stop the question", () => {
  expect(text(EVENT_SAMPLES["guardrails.checked"]).title).toBe(
    "All 2 safety checks passed",
  );
  expect(
    text({
      type: "guardrails.checked",
      checks: [
        { name: "topic", passed: false },
        { name: "rate_limit", passed: true },
      ],
    }).title,
  ).toBe("Safety checks stopped the question (1/2 passed)");
});

it("says whether a saved answer was found", () => {
  expect(text(EVENT_SAMPLES["cache.checked"]).title).toBe(
    "No saved answer, asking the model",
  );
});

it("shows the model thinking, then what it chose", () => {
  expect(text(EVENT_SAMPLES["llm.started"]).title).toBe(
    "The model is deciding what to do next",
  );
  expect(
    text(EVENT_SAMPLES["llm.started"], EVENT_SAMPLES["llm.completed"]).title,
  ).toBe("The model chose to search Eliyahu's notes");
});

it("says a model call didn't finish once the run is over", () => {
  const [step] = diveSteps(stream([EVENT_SAMPLES["llm.started"]]));

  expect(stepText(step, copy, true).title).toBe("The model call didn't finish");
});

it("labels model call 2 as a round of the agent loop", () => {
  const { label } = text({ type: "llm.started", call: 2 });

  expect(label).toBe("Model call 2 · agent loop, round 2");
});

it("names the tool being run", () => {
  expect(text(EVENT_SAMPLES["tool.called"]).title).toBe(
    "Searching Eliyahu's notes",
  );
  expect(
    text({ type: "tool.called", tool: "github_activity", args: {} }).title,
  ).toBe("Running github_activity");
});

it("counts passages that clear the gate", () => {
  expect(text(EVENT_SAMPLES["retrieval.completed"]).title).toBe(
    "Scored 2 passages, 1 good enough to use",
  );
});

it("says how many passages the answer is written from", () => {
  expect(text(EVENT_SAMPLES["generation.started"]).title).toBe(
    "Writing the answer from 1 passages",
  );
});

it("explains the decision", () => {
  expect(text(EVENT_SAMPLES["decision.made"]).title).toBe(
    "The answer is backed by the notes, so it goes out",
  );
});

it("counts the checked sources", () => {
  expect(text(EVENT_SAMPLES["citations.attached"]).title).toBe(
    "Checked 1 sources against the search",
  );
});

it("lands on the seabed, or calls the dive off", () => {
  expect(text(EVENT_SAMPLES["request.finished"]).title).toBe(
    "Seabed · answer delivered",
  );
  expect(text({ type: "request.finished", outcome: "blocked" }).title).toBe(
    "Dive called off",
  );
  expect(text(EVENT_SAMPLES.error).title).toBe(
    "Something went wrong on the server",
  );
});
