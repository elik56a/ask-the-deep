import { expect, it } from "vitest";
import { LOOP, SWIM } from "#/constants/seaScene.constants";
import { driftPose, loopPose, pathPose } from "#/utils/swim.utils";

it("starts a path at its centre line, swung out in z", () => {
  const pose = pathPose({ y: -10, r: 12, speed: 1, phase: 0, z: -20 }, 0);
  expect(pose.x).toBe(0);
  expect(pose.y).toBe(-10);
  expect(pose.z).toBe(-20 + SWIM.swing);
});

it("keeps a drift at its depth in z", () => {
  expect(driftPose({ x: 1, y: -5, z: -9, phase: 0 }, 3).z).toBe(-9);
});

it("loops around its point", () => {
  const pose = loopPose(
    { x: 2, y: -50, z: -20, speed: 1, phase: Math.PI / 2 },
    0,
  );
  expect(pose.x).toBeCloseTo(2 + LOOP.rx);
  expect(pose.z).toBeCloseTo(-20);
});
