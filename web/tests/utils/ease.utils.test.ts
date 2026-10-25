import { expect, it } from "vitest";
import { MAX_FRAME_S } from "#/constants/motion.constants";
import {
  approach,
  clamp01,
  easeOutCubic,
  frameSeconds,
  oscillate,
} from "#/utils/ease.utils";

it("approaches the target and never overshoots", () => {
  expect(approach(0, 10, 2, 0.25)).toBe(5);
  expect(approach(0, 10, 2, 5)).toBe(10);
});

it("oscillates around the base", () => {
  expect(oscillate(1, 2, 1, Math.PI / 2)).toBeCloseTo(3);
  expect(oscillate(1, 2, 1, 0, Math.PI)).toBeCloseTo(1);
});

it("eases out and clamps", () => {
  expect(easeOutCubic(0)).toBe(0);
  expect(easeOutCubic(0.5)).toBe(0.875);
  expect(easeOutCubic(2)).toBe(1);
});

it("holds a value to [0, 1]", () => {
  expect([-1, 0.4, 2].map(clamp01)).toEqual([0, 0.4, 1]);
});

it("caps the frame time, and starts from zero", () => {
  expect(frameSeconds(1000, 0)).toBe(0);
  expect(frameSeconds(1016, 1000)).toBeCloseTo(0.016);
  expect(frameSeconds(5000, 1000)).toBe(MAX_FRAME_S);
});
