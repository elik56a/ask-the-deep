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

const markup = (lang: Lang, carried = 0) => {
  const steps = diveSteps(run);
  return renderToStaticMarkup(
    <DiveLog
      lang={lang}
      steps={steps}
      ended
      tops={steps.map((_, i) => i * 300)}
      measured
      listRef={{ current: null }}
      ctx={{
        carried,
        skipped: false,
        wallMs: 30_000,
        retrieved: buildTrace(run).retrieved,
      }}
      model="gemini-test"
      written={{ words: 0, total: 0 }}
      focusChunk={null}
      onFocusChunk={() => {}}
      end={null}
    />,
  );
};
// Titles stream word by word, so compare the text without the word spans.
const render = (lang: Lang, carried = 0) =>
  markup(lang, carried).replace(/<[^>]+>/g, "");

it("numbers each step and says what the server did, in plain words", () => {
  const html = render("en");

  expect(html).toContain("Step 1");
  expect(html).toContain("Step 8");
  expect(html).not.toContain("Step 9");
  expect(html).toContain("The model chose to search Eliyahu&#x27;s notes");
  expect(html).toContain("Model call 2 · agent loop, round 2");
  expect(html).toContain("1 of 2 passages are good enough to use");
  expect(html).toContain("Seabed · answer delivered");
});

it("keeps the evidence and the technical line under each title", () => {
  const html = render("en");

  expect(html).toContain("Decided → call");
  expect(html).toContain("1 rise to the model");
  expect(html).toContain("1 sink below the gate");
  expect(html).toContain("1 of 1 sources match this dive&#x27;s search");
  expect(html).toContain("llm.started · event #2 · server +");
});

it("puts only the newest step in focus, narrated", () => {
  const html = markup("en");

  expect(html.match(/data-focus="true"/g)).toHaveLength(1);
  expect(html.replace(/<[^>]+>/g, "")).toContain("The server finished in");
});

it("says when a follow-up carries the conversation", () => {
  const html = render("en", 2);

  expect(html).toContain("carrying 2 earlier messages");
  expect(html).toContain("history · 2 messages");
});

it("writes the steps in Hebrew", () => {
  const html = render("he");

  expect(html).toContain("שלב 1");
  expect(html).toContain("המודל בחר לחפש ברשימות של אליהו");
});
