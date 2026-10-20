import { expect, it } from "vitest";
import { ZONE_PX } from "#/constants/sea.constants";
import { diveSteps } from "#/utils/depth.utils";
import { diveProfile } from "#/utils/diveProfile.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const steps = diveSteps(
  stream([
    EVENT_SAMPLES["request.started"],
    EVENT_SAMPLES["llm.started"],
    EVENT_SAMPLES["llm.completed"],
    EVENT_SAMPLES["request.finished"],
  ]),
);

it("starts at the surface and ends at the last step when the run ends", () => {
  const points = diveProfile(steps, [0, ZONE_PX, ZONE_PX * 3], 2910);

  expect(points[0]).toEqual({ t: 0, zone: 0, kind: "start" });
  expect(points.map((point) => point.kind)).toEqual([
    "start",
    "start",
    "llm",
    "seabed",
  ]);
  expect(points[2]).toMatchObject({ t: 100, zone: 1 });
  expect(points.at(-1)).toMatchObject({ t: 2910, zone: 3 });
});

it("only goes down and forward in time", () => {
  const points = diveProfile(steps, [10, 900, 2700], 2910);

  points.slice(1).forEach((point, i) => {
    expect(point.t).toBeGreaterThanOrEqual(points[i].t);
    expect(point.zone).toBeGreaterThanOrEqual(points[i].zone);
  });
});
