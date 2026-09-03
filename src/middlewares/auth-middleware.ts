// middlewares/auth.middleware.ts
import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";
import { db } from "@/modules/auth/db/client";
import { refreshTokens } from "@/modules/auth/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { config } from "config";

export const authMiddleware = new Elysia().derive(async ({ cookie, set }) => {
  const accessToken = String(cookie.auth ?? "");
  const accountId = String(cookie.accountId ?? "");

  if (accessToken) {
    const payload = jwt.verify(accessToken, config.jwtSecret);

    if (payload) {
      return { user: payload };
    }
  }

  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.accountId, accountId),
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
    },
    refreshToken: {
      value: newRefreshTokenValue,
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "strict",
    },
  };

  return { user: { userId: storedToken.accountId } };
});



/// not finsihed yet masi ada beberpa hal yang perlu diperharikan terkiar hubungannya dengan auth-service.ts