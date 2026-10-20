import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Seabed } from "#/components/Seabed";
import type { StreamEvent } from "#/generated/events.gen";
import { diveSteps } from "#/utils/depth.utils";
import { buildTrace } from "#/utils/trace.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const render = (events: StreamEvent["event"][]) => {
  const run = stream(events);
  const steps = diveSteps(run);
  return renderToStaticMarkup(
    <Seabed
      lang="en"
      steps={steps}
      tops={steps.map((_, i) => i * 400)}
      trace={buildTrace(run)}
      onSurface={() => {}}
      onReplay={() => {}}
    />,
  );
};

const through = [
  EVENT_SAMPLES["request.started"],
  EVENT_SAMPLES["guardrails.checked"],
  EVENT_SAMPLES["llm.started"],
  EVENT_SAMPLES["llm.completed"],
  EVENT_SAMPLES["usage.reported"],
];

it("draws the dive profile and the receipt for an answer", () => {
  const html = render([...through, EVENT_SAMPLES["request.finished"]]);

  expect(html).toContain('role="img"');
  expect(html).toContain("Dive profile: 4 steps down to");
  expect(html).toContain("2.91 s");
  expect(html).toContain("3,784");
  expect(html).toContain("$0.000419");
  expect(html).toContain("Answered");
  expect(html).toContain("Surface");
  expect(html).toContain("Replay the dive");
});

it("lands on the seabed when the notes have nothing", () => {
  const html = render([
    ...through,
    { type: "request.finished", outcome: "no_information" },
  ]);

  expect(html).toContain('role="img"');
  expect(html).toContain("No information");
});

it("calls a blocked dive off where it stopped, without a profile", () => {
  const html = render([
    EVENT_SAMPLES["request.started"],
    {
      type: "guardrails.checked",
      checks: [{ name: "topic", passed: false }],
    },
    { type: "request.finished", outcome: "blocked" },
  ]);

  expect(html).not.toContain('role="img"');
  expect(html).toContain(
    "The run ended early, so there is no seabed this time.",
  );
  expect(html).toContain("Blocked");
  expect(html).toContain("Surface");
});
