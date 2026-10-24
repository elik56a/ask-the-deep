import { expect, it } from "vitest";
import {
  STEP_GAP,
  SURFACE_Y,
  WATERLINE_Y,
  ZONE_HEAD,
  ZONE_PX,
  ZONES,
} from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { StepKind } from "#/types/sea.types";
import {
  depthReadout,
  diveEnd,
  diveOffset,
  diveSteps,
  floorPx,
  keyframe,
  metersToPx,
  placeSteps,
  pxToMeters,
  smoothstep,
  stepKindOf,
  surfaceEye,
  zoneAt,
  zoneLabel,
} from "#/utils/depth.utils";

it("gives every zone the same scroll height", () => {
  ZONES.forEach((zone, index) => {
    expect(metersToPx(zone.from)).toBe(index * ZONE_PX);
  });
});

it("round-trips meters through pixels", () => {
  for (const meters of [0, 50, 200, 750, 1000, 3999, 4000, 5500, 8000]) {
    expect(pxToMeters(metersToPx(meters))).toBeCloseTo(meters);
  }
});

it("clamps above the surface and below the trench", () => {
  expect(pxToMeters(-100)).toBe(0);
  expect(pxToMeters(ZONE_PX * 99)).toBe(ZONES[ZONES.length - 1].to);
});

it("names the zone a depth is in", () => {
  expect(zoneAt(0).id).toBe("sunlight");
  expect(zoneAt(200).id).toBe("twilight");
  expect(zoneAt(4500).id).toBe("abyss");
  expect(zoneAt(20000).id).toBe("trench");
});

it("starts each stage in its own zone", () => {
  expect(zoneAt(pxToMeters(floorPx("llm"))).id).toBe("twilight");
  expect(zoneAt(pxToMeters(floorPx("tool"))).id).toBe("midnight");
  expect(zoneAt(pxToMeters(floorPx("gen"))).id).toBe("abyss");
});

it("never places a step above the one before it", () => {
  const kinds: StepKind[] = ["start", "guard", "llm", "tool", "guard", "gen"];
  const tops = placeSteps(kinds.map((kind) => ({ kind, height: 150 })));

  tops.slice(1).forEach((top, index) => {
    expect(top).toBeGreaterThanOrEqual(tops[index] + 150 + STEP_GAP);
  });
});

it("takes agent loops down into the trench", () => {
  const round: StepKind[] = ["llm", "tool", "tool"];
  const steps = Array.from({ length: 6 }, () => round)
    .flat()
    .map((kind) => ({ kind, height: 220 }));
  const tops = placeSteps(steps);

  expect(zoneAt(pxToMeters(tops[tops.length - 1])).id).toBe("trench");
});

it("adds a step only for events that start one", () => {
  expect(stepKindOf({ type: "text.delta", text: "hi" })).toBeNull();
  expect(stepKindOf({ type: "llm.started", call: 2 })).toBe("llm");
  expect(
    stepKindOf({
      type: "guardrails.checked",
      checks: [{ name: "topic", passed: false }],
    }),
  ).toBe("abort");
  expect(
    stepKindOf({ type: "request.finished", outcome: "no_information" }),
  ).toBe("seabed");
  expect(stepKindOf({ type: "request.finished", outcome: "blocked" })).toBe(
    "abort",
  );
});

it("interpolates between keyframes and holds at the ends", () => {
  const keys: [number, number][] = [
    [0, 1],
    [1, 0.5],
    [3, 0],
  ];

  expect(keyframe(-1, keys)).toBe(1);
  expect(keyframe(0.5, keys)).toBeCloseTo(0.75);
  expect(keyframe(2, keys)).toBeCloseTo(0.25);
  expect(keyframe(9, keys)).toBe(0);
});

it("eases from 0 to 1 and clamps", () => {
  expect(smoothstep(-2)).toBe(0);
  expect(smoothstep(0.5)).toBe(0.5);
  expect(smoothstep(4)).toBe(1);
});

it("measures the dive from the diver line, not the top of the screen", () => {
  expect(diveOffset(0, 1000, 1000)).toBe(-740);
  expect(diveOffset(740, 1000, 1000)).toBe(0);
  expect(zoneLabel(diveOffset(0, 1000, 1000))).toBe("surface");
  expect(zoneLabel(diveOffset(740 + ZONE_PX, 1000, 1000))).toBe("twilight");
  expect(diveOffset(5000, Number.POSITIVE_INFINITY, 1000)).toBe(
    Number.NEGATIVE_INFINITY,
  );
});

it("closes a model call and a tool call with their results", () => {
  const events: StreamEvent["event"][] = [
    { type: "llm.started", call: 1 },
    {
      type: "llm.completed",
      call: 1,
      model: "m",
      input_tokens: 1,
      output_tokens: 1,
      cost_usd: 0,
      duration_ms: 1,
      decision: "tools",
      tools: ["search_knowledge"],
      fallback: false,
      rejected: null,
    },
    { type: "tool.called", tool: "search_knowledge", args: {} },
    { type: "retrieval.started", query: "q" },
    { type: "retrieval.completed", passages: [], threshold: 0.5 },
    {
      type: "tool.completed",
      tool: "search_knowledge",
      ok: true,
      result_count: 0,
      duration_ms: 1,
      passage_ids: [],
    },
    { type: "llm.started", call: 2 },
  ];
  const steps = diveSteps(
    events.map((event, seq) => ({ request_id: "r", seq, t_ms: seq, event })),
  );

  expect(steps.map((step) => step.kind)).toEqual([
    "llm",
    "tool",
    "tool",
    "llm",
  ]);
  expect(steps[0].result?.event.type).toBe("llm.completed");
  expect(steps[1].result?.event.type).toBe("tool.completed");
  expect(steps[3].result).toBeNull();
});

it("never covers a zone label with a card", () => {
  const kinds: StepKind[] = ["llm", "tool", "tool", "llm", "tool", "gen"];
  const height = 260;
  const tops = placeSteps(kinds.map((kind) => ({ kind, height })));
  const lines = ZONES.map((zone) => metersToPx(zone.from));

  for (const top of tops) {
    for (const line of lines) {
      expect(top >= line + ZONE_HEAD || top + height <= line).toBe(true);
    }
  }
});

const AIR = "{t} °C air";

it("reads depth, water temperature and pressure under the water", () => {
  expect(depthReadout(0, 0, AIR)).toEqual({
    depth: "0",
    temp: "24 °C",
    pressure: "1.0 atm",
  });
  expect(depthReadout(45, 0, AIR).pressure).toBe("5.5 atm");
  expect(depthReadout(200, 0, AIR).temp).toBe("13 °C");
  expect(depthReadout(11000, 0, AIR)).toEqual({
    depth: "11,000",
    temp: "2.5 °C",
    pressure: "1,101 atm",
  });
});

it("reads the eye's height, the air's temperature and pressure above it", () => {
  expect(depthReadout(0, 2.4, AIR)).toEqual({
    depth: "+2.4",
    temp: "26 °C air",
    pressure: "1.00 atm",
  });
  expect(depthReadout(0, 1000, AIR)).toEqual({
    depth: "+1000.0",
    temp: "20 °C air",
    pressure: "0.89 atm",
  });
});

it("sinks the eye from the boat to the waterline as the page scrolls", () => {
  expect(surfaceEye(0, -740)).toBe(SURFACE_Y);
  expect(surfaceEye(740, -0.0001)).toBeCloseTo(WATERLINE_Y);
});

it("ends on the sand after the report, and short of it on an abort", () => {
  const steps = (types: StreamEvent["event"][]) =>
    diveSteps(
      types.map((event, seq) => ({ request_id: "r", seq, t_ms: seq, event })),
    );
  expect(diveEnd(steps([{ type: "llm.started", call: 1 }]))).toEqual({
    ended: false,
    onSand: false,
  });
  expect(
    diveEnd(steps([{ type: "request.finished", outcome: "answered" }])),
  ).toEqual({ ended: true, onSand: true });
  expect(diveEnd(steps([{ type: "error", code: "x", message: "y" }]))).toEqual({
    ended: true,
    onSand: false,
  });
});
