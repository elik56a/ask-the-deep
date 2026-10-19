import { createHash } from "node:crypto";

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const CLOUDFLARE_TURNSTILE = "https://challenges.cloudflare.com";

// Inline style attributes stay allowed: React and Radix position elements
// with them, and styles can't run code.
const BASE_POLICY: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", CLOUDFLARE_TURNSTILE],
  "frame-src": [CLOUDFLARE_TURNSTILE],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
};

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
