export const CLOUDFLARE_TURNSTILE = "https://challenges.cloudflare.com";

// Inline style attributes stay allowed: React and Radix position elements
// with them, and styles can't run code.
export const BASE_POLICY: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", CLOUDFLARE_TURNSTILE],
  "frame-src": [CLOUDFLARE_TURNSTILE],
  "style-src": ["'self'", "'unsafe-inline'"],
  // blob: is how the 3D model loader hands out a model's embedded textures;
  // data: fonts are small font files Vite inlines. Neither can run code.
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", "blob:"],
};

export const INLINE_SCRIPT =
  /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
