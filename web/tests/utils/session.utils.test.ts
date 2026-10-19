import { describe, expect, it } from "vitest";
import { isSession, isUsable, startSession } from "#/utils/session.utils";

const reply =
  (status: number, body: unknown): typeof fetch =>
  async () =>
    new Response(JSON.stringify(body), { status });

describe("session", () => {
  it("trades a Turnstile token for a session that expires", async () => {
    const session = await startSession(
      "tok",
      1_000,
      reply(200, { session: "s", expires_in: 3600 }),
    );
    expect(session).toEqual({ token: "s", expiresAt: 3_601_000 });
  });

  it("fails when the human check fails or the reply is odd", async () => {
    await expect(startSession("tok", 0, reply(403, {}))).rejects.toThrow();
    await expect(
      startSession("tok", 0, reply(200, { x: 1 })),
    ).rejects.toThrow();
  });

  it("renews a minute before it expires", () => {
    const session = { token: "s", expiresAt: 100_000 };
    expect(isUsable(session, 30_000)).toBe(true);
    expect(isUsable(session, 50_000)).toBe(false);
    expect(isUsable(undefined, 0)).toBe(false);
  });

  it("recognizes a stored session", () => {
    expect(isSession({ token: "s", expiresAt: 1 })).toBe(true);
    expect(isSession({ token: 1 })).toBe(false);
    expect(isSession(null)).toBe(false);
  });
});
