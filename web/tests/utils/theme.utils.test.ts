import { expect, it } from "vitest";
import { isTheme } from "#/utils/theme.utils";

it("accepts only the two themes", () => {
  expect(isTheme("dark")).toBe(true);
  expect(isTheme("light")).toBe(true);
  expect(isTheme("blue")).toBe(false);
  expect(isTheme(undefined)).toBe(false);
});
