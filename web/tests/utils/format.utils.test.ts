import { expect, it } from "vitest";
import {
  formatInt,
  formatMs,
  formatTick,
  formatUsd,
} from "#/utils/format.utils";

it("shows milliseconds under a second and seconds above", () => {
  expect(formatMs(803.4)).toBe("803 ms");
  expect(formatMs(2910)).toBe("2.91 s");
});

it("shows cost to a millionth of a dollar", () => {
  expect(formatUsd(0.0004186)).toBe("$0.000419");
  expect(formatUsd(0)).toBe("$0");
});

it("groups thousands", () => {
  expect(formatInt(3650)).toBe("3,650");
});

it("labels the time axis in whole seconds past one", () => {
  expect(formatTick(0)).toBe("0");
  expect(formatTick(500)).toBe("500 ms");
  expect(formatTick(2000)).toBe("2 s");
});
