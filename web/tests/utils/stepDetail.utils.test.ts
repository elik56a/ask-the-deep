import { expect, it } from "vitest";
import { WRITTEN_BARS } from "#/constants/hood.constants";
import {
  passedCount,
  splitAround,
  writtenBars,
} from "#/utils/stepDetail.utils";

it("splits copy around its token", () => {
  expect(splitAround("Thinking with {model}…", "{model}")).toEqual([
    "Thinking with ",
    "…",
  ]);
  expect(splitAround("No token", "{model}")).toEqual(["No token", ""]);
});

it("fills the writing bars one after another, the last one short", () => {
  expect(writtenBars(0, 30, WRITTEN_BARS)).toEqual([0, 0, 0]);
  expect(writtenBars(15, 30, WRITTEN_BARS)).toEqual([1, 0.5, 0]);
  expect(writtenBars(30, 30, WRITTEN_BARS)).toEqual([1, 1, 0.6]);
  expect(writtenBars(0, 0, WRITTEN_BARS)).toEqual([0, 0, 0]);
});

it("counts the passages above the gate", () => {
  const passage = (above_threshold: boolean) => ({
    chunk_id: "a.md#b",
    breadcrumb: "A",
    score: 0.5,
    above_threshold,
  });
  expect(passedCount([passage(true), passage(false), passage(true)])).toBe(2);
});
