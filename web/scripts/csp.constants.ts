export const CLOUDFLARE_TURNSTILE = "https://challenges.cloudflare.com";

// Inline style attributes stay allowed: React and Radix position elements
// with them, and styles can't run code.
export const BASE_POLICY: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", CLOUDFLARE_TURNSTILE],
  "frame-src": [CLOUDFLARE_TURNSTILE],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
};

export const INLINE_SCRIPT =
  /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
