import { expect, it } from "vitest";
import { spreadAt } from "#/utils/spread.utils";

it("returns a plain number as is", () => {
  expect(spreadAt(4, 3, 0.5)).toBe(4);
});

it("adds a step per member and a share of the jitter", () => {
  expect(spreadAt({ base: 10, step: -2, jitter: 4 }, 3, 0.5)).toBe(6);
  expect(spreadAt({ jitter: 6 }, 0, 0)).toBe(0);
});
