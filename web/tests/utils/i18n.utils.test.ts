import { describe, expect, it } from "vitest";
import { isLang } from "#/utils/i18n.utils";

describe("isLang", () => {
  it("accepts only the supported languages", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("he")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang("toString")).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});
