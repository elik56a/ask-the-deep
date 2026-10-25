import { describe, expect, it } from "vitest";
import { isLang, langFromSearch, searchWithLang } from "#/utils/i18n.utils";

describe("isLang", () => {
  it("accepts only the supported languages", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("he")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang("toString")).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});

describe("langFromSearch", () => {
  it("reads a supported language from the query", () => {
    expect(langFromSearch("?lang=he")).toBe("he");
    expect(langFromSearch("?utm_source=x&lang=en")).toBe("en");
  });

  it("ignores a missing or unsupported language", () => {
    expect(langFromSearch("")).toBeNull();
    expect(langFromSearch("?lang=fr")).toBeNull();
  });
});

it("sets the language and keeps the other parameters", () => {
  expect(searchWithLang("", "he")).toBe("?lang=he");
  expect(searchWithLang("?utm_source=x&lang=en", "he")).toBe(
    "?utm_source=x&lang=he",
  );
});
