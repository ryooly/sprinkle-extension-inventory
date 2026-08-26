// middlewares/auth.middleware.ts
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { AppError } from "./errorHandler";
import { db } from "@/modules/auth/db/client";
import { refreshTokens } from "@/modules/auth/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const authMiddleware = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .derive(async ({ jwt, cookie, set }) => {
    const accessToken = String(cookie.auth ?? "");
    const accountId = String(cookie.accountId ?? "");

    if (accessToken) {
      const payload = await jwt.verify(accessToken);

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

    const newAccessToken = await jwt.sign({
      userId: storedToken.accountId,
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    });

    set.cookie = {
      auth: {
        value: newAccessToken,
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      },
    };

    return { user: { userId: storedToken.accountId } };
  });
