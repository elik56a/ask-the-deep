import { describe, expect, it } from "vitest";
import { linkBareUrls } from "#/utils/markdown.utils";

describe("linkBareUrls", () => {
  it("wraps a bare URL and leaves the sentence's punctuation outside", () => {
    expect(
      linkBareUrls(
        "LinkedIn at https://www.linkedin.com/in/elikri, or https://github.com/elik56a.",
      ),
    ).toBe(
      "LinkedIn at <https://www.linkedin.com/in/elikri>, or <https://github.com/elik56a>.",
    );
  });

  it("stops at Hebrew text", () => {
    expect(linkBareUrls("בלינקדאין https://x.dev/a.")).toBe(
      "בלינקדאין <https://x.dev/a>.",
    );
  });

  it("wraps a URL in parentheses after its name", () => {
    expect(
      linkBareUrls("garden-site (https://github.com/elik56a/garden-site),"),
    ).toBe("garden-site (<https://github.com/elik56a/garden-site>),");
  });

  it("leaves links, autolinks and code alone", () => {
    const text = "[me](https://x.dev) <https://y.dev> `https://z.dev`";
    expect(linkBareUrls(text)).toBe(text);
  });
});
