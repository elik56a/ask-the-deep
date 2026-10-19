import { API_SESSION_URL } from "#/constants/api.constants";
import { SESSION_RENEW_BEFORE_MS } from "#/constants/session.constants";
import type { Session } from "#/types/session.types";

export function isUsable(
  session: Session | undefined,
  now: number,
): session is Session {
  return (
    session !== undefined && session.expiresAt - now > SESSION_RENEW_BEFORE_MS
  );
}

export function isSession(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "token" in value &&
    typeof value.token === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number"
  );
}

export async function startSession(
  turnstileToken: string,
  now: number,
  fetcher: typeof fetch = fetch,
): Promise<Session> {
  const response = await fetcher(API_SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ turnstile_token: turnstileToken }),
  });
  if (!response.ok) {
    throw new Error(`Human check failed (${response.status})`);
  }
  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("session" in body) ||
    typeof body.session !== "string" ||
    !("expires_in" in body) ||
    typeof body.expires_in !== "number"
  ) {
    throw new Error("Unexpected session response");
  }
  return { token: body.session, expiresAt: now + body.expires_in * 1000 };
}
