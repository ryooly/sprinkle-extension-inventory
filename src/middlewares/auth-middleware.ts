import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { AppError } from "@/errorhandler";
import { getCookiePolicy } from "./cookie-policy";
import { db } from "@/db/client";
import { refreshTokens } from "@/models";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { config } from "config";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authMiddleware = new Elysia()
  .derive(async ({ cookie, set }) => {
    const accessToken = String(cookie.auth ?? "");
    const accountId = String(cookie.accountId ?? "");
    const refreshToken = String(cookie.refreshToken ?? "");

    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, config.jwtSecret);

        if (typeof payload === "object" && payload !== null) {
          return { user: payload };
        }
      } catch {

      }
    }

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

    const { secure, sameSite } = getCookiePolicy();
    set.cookie = {
      auth: {
        value: newAccessToken,
        httpOnly: true,
        secure,
        maxAge: 15 * 60,
        sameSite,
      },
      refreshToken: {
        value: newRefreshTokenValue,
        httpOnly: true,
        secure,
        maxAge: 60 * 60 * 24 * 7,
        sameSite,
      },
    };

    return { user: { userId: storedToken.accountId } };
  })

  .as("scoped");
