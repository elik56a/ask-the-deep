import { expect, it } from "vitest";
import {
  GATE,
  LANTERNS,
  SONAR,
  SPLASH_RINGS,
} from "#/constants/seaScene.constants";
import {
  foamRingFrame,
  gateOpacity,
  lanternFrame,
  ringFrame,
} from "#/utils/markers.utils";

it("grows a ring and hides it after its life", () => {
  expect(ringFrame(0)).toEqual({
    visible: true,
    scale: SONAR.startScale,
    opacity: SONAR.opacity,
  });
  expect(ringFrame(SONAR.life).visible).toBe(false);
});

it("fades the gate in, holds and fades it out", () => {
  expect(gateOpacity(0)).toBe(0);
  expect(gateOpacity(GATE.fadeOutFrom)).toBe(GATE.opacity);
  expect(gateOpacity(GATE.life)).toBe(0);
});

it("raises lanterns above the gate and sinks the rest", () => {
  const settled = LANTERNS.rise;
  expect(lanternFrame(settled, 0, 0, true).dz).toBeCloseTo(LANTERNS.forward);
  expect(lanternFrame(settled, 0, 0, false).dy).toBeCloseTo(-LANTERNS.sink);
  expect(lanternFrame(LANTERNS.life + 1, 0, 0, true).opacity).toBe(0);
});

it("spreads a foam ring out and thins it away, idle before its delay and after its life", () => {
  expect(foamRingFrame(-0.1).visible).toBe(false);
  expect(foamRingFrame(0)).toEqual({
    visible: true,
    scale: SPLASH_RINGS.from,
    opacity: SPLASH_RINGS.opacity,
  });
  expect(foamRingFrame(SPLASH_RINGS.lifeS / 2).scale).toBeGreaterThan(
    (SPLASH_RINGS.from + SPLASH_RINGS.to) / 2,
  );
  expect(foamRingFrame(SPLASH_RINGS.lifeS).visible).toBe(false);
});
