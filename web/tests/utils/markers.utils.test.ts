import { expect, it } from "vitest";
import { GATE, LANTERNS, SONAR } from "#/constants/seaScene.constants";
import { gateOpacity, lanternFrame, ringFrame } from "#/utils/markers.utils";

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
