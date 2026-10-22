import { expect, it } from "vitest";
import { approach, easeOutCubic, oscillate } from "#/utils/ease.utils";

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
