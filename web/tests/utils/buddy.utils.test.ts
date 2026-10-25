import { expect, it } from "vitest";
import { BUDDY } from "#/constants/sea.constants";
import { buddyPace, buddyPose, buddyScale } from "#/utils/buddy.utils";

it("eases the pace towards a hard swim while busy, and back to a drift", () => {
  const rising = buddyPace(BUDDY.restPace, true, 0.1);
  expect(rising).toBeGreaterThan(BUDDY.restPace);
  expect(rising).toBeLessThan(BUDDY.busyPace);
  expect(buddyPace(BUDDY.busyPace, false, 10)).toBeCloseTo(BUDDY.restPace);
});

it("holds still at the start of the swim", () => {
  expect(buddyPose(0, BUDDY.busyPace)).toEqual({ turn: BUDDY.turn, bob: 0 });
});

it("fits the longer side of the model into the view", () => {
  expect(buddyScale({ x: 4, y: 2 }, { x: 2, y: 2 })).toBeCloseTo(BUDDY.fill);
  expect(buddyScale({ x: 4, y: 4 }, { x: 8, y: 1 })).toBeCloseTo(
    BUDDY.fill / 2,
  );
});
