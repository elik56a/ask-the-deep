import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DiveComputer } from "#/components/DiveComputer";
import { buildTrace } from "#/utils/trace.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const trace = buildTrace(
  stream([
    EVENT_SAMPLES["llm.started"],
    EVENT_SAMPLES["llm.completed"],
    EVENT_SAMPLES["usage.reported"],
    EVENT_SAMPLES["request.finished"],
  ]),
);

it("reads out depth, status, time and the run's totals", () => {
  const html = renderToStaticMarkup(
    <DiveComputer
      lang="en"
      waterRef={{ current: null }}
      totals={trace.totals}
      status="answered"
      running={false}
      finalMs={2910}
    />,
  );

  expect(html).toContain("Dive computer");
  expect(html).toContain("Surface");
  expect(html).toContain("Answered");
  expect(html).toContain("2.910 s");
  expect(html).toContain("3,650 / 134");
  expect(html).toContain("$0.000419");
  expect(html).toContain("1.59 s");
});
