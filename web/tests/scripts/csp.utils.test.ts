import { describe, expect, it } from "vitest";
import { scriptHashes, withCsp } from "../../scripts/csp.utils.ts";

const PAGE =
  '<html><head><meta charSet="utf-8"/></head><body>' +
  "<script>alert(1)</script>" +
  '<script type="module" src="/assets/app.js"></script>' +
  '<script data-tsr-stream-part="">self.x=1</script>' +
  "</body></html>";

describe("CSP", () => {
  it("fingerprints inline scripts only", () => {
    const hashes = scriptHashes(PAGE);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toBe(
      "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
    );
  });

  it("puts the policy first in <head>, before any script", () => {
    const html = withCsp(PAGE);
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
      html.indexOf("<script"),
    );
    expect(html).toContain(
      "script-src 'self' https://challenges.cloudflare.com 'sha256-",
    );
    expect(html).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("refuses a page with no <head>", () => {
    expect(() => withCsp("<html></html>")).toThrow();
  });
});
