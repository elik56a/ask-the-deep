export const SESSION_RENEW_BEFORE_MS = 60_000;

export const SESSION_STORAGE_KEY = "portfolio-chat:session";

// Cloudflare's always-pass test key until the real one is registered (P5.15).
export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
