import { createHash } from "node:crypto";
import { BASE_POLICY, INLINE_SCRIPT } from "./csp.constants.ts";

export function scriptHashes(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT)].map(
    ([, body]) =>
      `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
  );
}

export function withCsp(html: string): string {
  if (!html.includes("<head>")) {
    throw new Error("No <head> to put the CSP in");
  }
  const policy = {
    ...BASE_POLICY,
    "script-src": [...BASE_POLICY["script-src"], ...scriptHashes(html)],
  };
  const content = Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
  return html.replace(
    "<head>",
    `<head><meta http-equiv="Content-Security-Policy" content="${content}"/>`,
  );
}
