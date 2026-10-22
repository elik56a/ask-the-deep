import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DiveLog } from "#/components/DiveLog";
import type { Lang } from "#/types/i18n.types";
import { diveSteps } from "#/utils/depth.utils";
import { buildTrace } from "#/utils/trace.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const run = stream([
  EVENT_SAMPLES["request.started"],
  EVENT_SAMPLES["guardrails.checked"],
  EVENT_SAMPLES["llm.started"],
  EVENT_SAMPLES["llm.completed"],
  EVENT_SAMPLES["tool.called"],
  EVENT_SAMPLES["retrieval.started"],
  EVENT_SAMPLES["retrieval.completed"],
  EVENT_SAMPLES["tool.completed"],
  { type: "llm.started", call: 2 },
  EVENT_SAMPLES["citations.attached"],
  EVENT_SAMPLES["request.finished"],
]);

const render = (lang: Lang) => {
  const steps = diveSteps(run);
  return renderToStaticMarkup(
    <DiveLog
      lang={lang}
      steps={steps}
      ended
      tops={steps.map((_, i) => i * 300)}
      listRef={{ current: null }}
      retrieved={buildTrace(run).retrieved}
      focusChunk={null}
      onFocusChunk={() => {}}
      end={null}
    />,
    // Titles stream word by word, so compare the text without the word spans.
  ).replace(/<[^>]+>/g, "");
};

it("numbers each step and says what the server did, in plain words", () => {
  const html = render("en");

  expect(html).toContain("Step 1");
  expect(html).toContain("Step 8");
  expect(html).not.toContain("Step 9");
  expect(html).toContain("The model chose to search Eliyahu&#x27;s notes");
  expect(html).toContain("Model call 2 · agent loop, round 2");
  expect(html).toContain("Scored 2 passages, 1 good enough to use");
  expect(html).toContain("Seabed · answer delivered");
});

it("keeps the evidence and the technical line under each title", () => {
  const html = render("en");

  expect(html).toContain("Decided → call");
  expect(html).toContain("1 reach the model");
  expect(html).toContain("1 blocked below the gate");
  expect(html).toContain("1/1 cited passages were retrieved in this run");
  expect(html).toContain("llm.started → llm.completed · #2");
});

it("writes the steps in Hebrew", () => {
  const html = render("he");

  expect(html).toContain("שלב 1");
  expect(html).toContain("המודל בחר לחפש ברשימות של אליהו");
});
