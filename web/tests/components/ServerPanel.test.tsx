import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ServerPanel } from "#/components/ServerPanel";
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

it("shows only the server's own numbers: status, clock and totals", () => {
  const html = renderToStaticMarkup(
    <ServerPanel
      lang="en"
      totals={trace.totals}
      status="answered"
      clockMs={2910}
      covered={false}
    />,
  );

  expect(html).toContain("From the server");
  expect(html).toContain("Answered");
  expect(html).toContain("2.910 s");
  expect(html).toContain("3,650");
  expect(html).toContain("134");
  expect(html).toContain("$0.000419");
  expect(html).toContain("1.59 s");
  expect(html).not.toContain(" m<");
});
