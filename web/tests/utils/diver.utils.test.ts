import { expect, it } from "vitest";
import { SURFACE_Y, WATERLINE_Y } from "#/constants/sea.constants";
import { DIVER } from "#/constants/seaScene.constants";
import { diverPose } from "#/utils/diver.utils";

const view = { t: 0, aspect: 16 / 9, fov: 55, side: 1, landK: 0 };

it("floats at rest on the reading side at the surface", () => {
  const pose = diverPose({ ...view, camY: SURFACE_Y });
  expect(pose.ease).toBe(0);
  expect(pose.x).toBeGreaterThan(0);
  expect(pose.z).toBe(DIVER.restZ);
});

it("flips to the other side in RTL", () => {
  expect(diverPose({ ...view, camY: SURFACE_Y, side: -1 }).x).toBeLessThan(0);
});

it("rides below the camera underwater", () => {
  const camY = WATERLINE_Y - 100;
  const pose = diverPose({ ...view, camY });
  expect(pose.ease).toBe(1);
  expect(pose.y).toBeCloseTo(camY - DIVER.below);
  expect(pose.x).toBeCloseTo(DIVER.diveX);
});

it("hovers beside the chat only on wide screens", () => {
  const camY = WATERLINE_Y - 100;
  expect(diverPose({ ...view, camY, landK: 1 }).hover).toBe(1);
  expect(diverPose({ ...view, camY, landK: 1, aspect: 0.5 }).hover).toBe(0);
});
