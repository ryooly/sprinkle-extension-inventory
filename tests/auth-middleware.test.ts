// ── Auth Middleware Tests ───────────────────────────────────────────────────
// Verifies the access-token fast path and the refresh fallback in
// src/middlewares/auth-middleware.ts.
//
// These tests never reach the database: every case either returns from a valid
// access token or is rejected by the cookie guard before any query runs.
//
// Run:  bun test tests/auth-middleware.test.ts

import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { authMiddleware } from "../src/middlewares/auth-middleware";

const VALID_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

// Elysia keeps a plugin's derived types local, so `user` is present at runtime
// but not on the parent context type. Same cast pattern used by
// src/middlewares/builder-middlewares.ts.
type AuthContext = {
  user?: {
    userId: string;
  };
};

const app = new Elysia()
  .use(authMiddleware)
  .get("/protected", (ctx) => ({
    ok: true,
    user: (ctx as typeof ctx & AuthContext).user,
  }));

function sendRequest(cookies: Record<string, string> = {}) {
  const header = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  return app.handle(
    new Request("http://localhost/protected", {
      headers: header ? { Cookie: header } : {},
    }),
  );
}

const signToken = (payload: object, secret = config.jwtSecret) =>
  jwt.sign(payload, secret);

// ── Access token fast path ──────────────────────────────────────────────────

describe("authMiddleware – access token fast path", () => {
  test("accepts a valid access token and exposes the user", async () => {
    const res = await sendRequest({
      auth: signToken({ userId: VALID_ACCOUNT_ID, exp: expIn(900) }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.userId).toBe(VALID_ACCOUNT_ID);
  });

  test("rejects a token signed with the wrong secret", async () => {
    const res = await sendRequest({
      auth: signToken(
        { userId: VALID_ACCOUNT_ID, exp: expIn(900) },
        "wrong-secret",
      ),
    });

    expect(res.status).toBe(401);
  });
});

// ── Refresh fallback ────────────────────────────────────────────────────────

describe("authMiddleware – refresh fallback", () => {
  test("an expired access token yields 401 instead of 500", async () => {
    const res = await sendRequest({
      auth: signToken({ userId: VALID_ACCOUNT_ID, exp: expIn(-60) }),
    });

    // Before the fix jwt.verify threw TokenExpiredError, which has no .status,
    // so Elysia mapped it to a 500 and the refresh path was unreachable.
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Unauthorized");
  });

  test("rejects a request with no cookies at all", async () => {
    const res = await sendRequest();

    expect(res.status).toBe(401);
  });

  test("rejects a non-uuid accountId before hitting the database", async () => {
    const res = await sendRequest({
      accountId: "not-a-uuid",
      refreshToken: "some-token",
    });

    // account_id is a uuid column – an unguarded query would raise a Postgres
    // cast error (500) instead of a clean 401.
    expect(res.status).toBe(401);
  });

  test("rejects a valid accountId with no refresh token cookie", async () => {
    const res = await sendRequest({ accountId: VALID_ACCOUNT_ID });

    expect(res.status).toBe(401);
  });
});

/** Epoch seconds offset from now. */
function expIn(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}
