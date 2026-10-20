import { expect, it } from "vitest";
import { STEP_GAP, ZONE_PX, ZONES } from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { StepKind } from "#/types/sea.types";
import {
  diveOffset,
  diveSteps,
  floorPx,
  keyframe,
  metersToPx,
  placeSteps,
  pxToMeters,
  smoothstep,
  stepKindOf,
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
  expect(diveOffset(0, 1000, 1000)).toBe(-700);
  expect(diveOffset(700, 1000, 1000)).toBe(0);
  expect(zoneLabel(diveOffset(0, 1000, 1000))).toBe("surface");
  expect(zoneLabel(diveOffset(700 + ZONE_PX, 1000, 1000))).toBe("twilight");
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
