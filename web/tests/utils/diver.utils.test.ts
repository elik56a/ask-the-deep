import { expect, it } from "vitest";
import { SURFACE_Y, WATERLINE_Y } from "#/constants/sea.constants";
import { CAMERA, DIVER, STRIDE } from "#/constants/seaScene.constants";
import {
  diveEase,
  diverPose,
  heroPose,
  strideEntryS,
  stridePose,
} from "#/utils/diver.utils";

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

it("comes up close for the jump: in the middle on narrow screens, head above the water", () => {
  const wide = heroPose(view);
  expect(wide.x).toBeGreaterThan(0);
  expect(wide.z).toBeCloseTo(CAMERA.z - STRIDE.heroDepth);
  expect(heroPose({ ...view, side: -1 }).x).toBeLessThan(0);
  expect(heroPose({ ...view, aspect: 0.5 }).x).toBe(0);
});

it("leaps up and over head first, then slides under away from the camera", () => {
  const hero = heroPose(view);
  const start = stridePose(0, hero, 1);
  const peak = stridePose(
    STRIDE.crouchS + STRIDE.flightS * STRIDE.peakAt,
    hero,
    1,
  );
  const end = stridePose(
    STRIDE.crouchS + STRIDE.flightS + STRIDE.sinkS,
    hero,
    1,
  );
  expect(start).toMatchObject({ x: hero.x, y: hero.y, pitch: 0 });
  expect(peak.y).toBeCloseTo(hero.y - STRIDE.crouch + STRIDE.rise);
  expect(end.y).toBeLessThan(-STRIDE.sink);
  expect(end.z).toBeLessThan(hero.z);
  expect(end.pitch).toBeCloseTo(Math.PI);
  expect(end.yaw).toBeCloseTo(STRIDE.leapYaw);
});

it("goes under during the arc's way down", () => {
  const entry = strideEntryS();
  expect(entry).toBeGreaterThan(
    STRIDE.crouchS + STRIDE.flightS * STRIDE.peakAt,
  );
  expect(entry).toBeLessThan(STRIDE.crouchS + STRIDE.flightS);
});

it("eases from the surface to the waterline", () => {
  expect(diveEase(SURFACE_Y)).toBe(0);
  expect(diveEase(WATERLINE_Y)).toBe(1);
});
