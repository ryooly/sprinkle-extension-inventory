// middlewares/auth.middleware.ts
import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";
import { db } from "@/modules/auth/db/client";
import { refreshTokens } from "@/modules/auth/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { config } from "config";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authMiddleware = new Elysia().derive(async ({ cookie, set }) => {
  const accessToken = String(cookie.auth ?? "");
  const accountId = String(cookie.accountId ?? "");
  const refreshToken = String(cookie.refreshToken ?? "");

  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, config.jwtSecret);

      // A JWT payload may also be a bare string; only accept the object form so
      // downstream handlers can rely on `user.userId`.
      if (typeof payload === "object" && payload !== null) {
        return { user: payload };
      }
    } catch {
      // Access token is expired or tampered with – fall through to the refresh
      // flow below instead of letting the error bubble up as a 500.
    }
  }

  // Both cookies are required to refresh. Validate before querying: account_id
  // is a uuid column, so an empty or malformed value would raise a Postgres
  // cast error (500) instead of a clean 401.
  if (!UUID_PATTERN.test(accountId) || !refreshToken) {
    throw new AppError(
      "Unauthorized: missing or invalid session cookies",
      401,
    );
  }

  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.accountId, accountId),
        eq(refreshTokens.token, refreshToken),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!storedToken) {
    throw new AppError(
      "Unauthorized: refresh token is invalid or expired",
      401,
    );
  }

  const newAccessToken = jwt.sign(
    { userId: storedToken.accountId },
    config.jwtSecret,
    { expiresIn: "15m" },
  );

  await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

  const newRefreshTokenValue = randomUUID();
  const newRefreshTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  await db.insert(refreshTokens).values({
    accountId: storedToken.accountId,
    token: newRefreshTokenValue,
    expiresAt: newRefreshTokenExpiresAt,
  });

  set.cookie = {
    auth: {
      value: newAccessToken,
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60,
      sameSite: "strict",
    }, /// mungkin perlu tambahkan accountId
    refreshToken: {
      value: newRefreshTokenValue,
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "strict",
    },
  };

  return { user: { userId: storedToken.accountId } };
})
  // Required: without `.as("scoped")` Elysia keeps this derive local to the
  // plugin, so it never runs for the routes of instances that `.use()` it and
  // every "protected" route stays publicly reachable.
  .as("scoped");



/// not finsihed yet masi ada beberpa hal yang perlu diperharikan terkiar hubungannya dengan auth-service.ts