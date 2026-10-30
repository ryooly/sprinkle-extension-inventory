import Elysia, { t } from "elysia";
import { UserController } from "@/modules/auth/controller/controller";
import { getCookiePolicy } from "@/middlewares/cookie-policy";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { AppError } from "@/errorhandler";
import { loginDbg, dbgFields } from "@/modules/auth/utils/loginDebug";
import type {
  RegisterInput,
  LoginInput,
  EmailLoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
  UpdateProfileInput,
} from "@/schemas/auth";

function sessionCookies(
  token: string,
  refreshToken: string,
  accountId: string,
) {
  const { secure, sameSite } = getCookiePolicy();

  return {
    auth: {
      value: token,
      httpOnly: true,
      secure,
      path: "/",
      maxAge: 60 * 15,
      sameSite,
    },
    accountId: {
      value: accountId,
      httpOnly: true,
      secure,
      path: "/",
      sameSite,
    },
    refreshToken: {
      value: refreshToken,
      httpOnly: true,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite,
    },
  };
}

export const userRoutes = new Elysia({ prefix: "/user" })
  .post(
    "/register",
    async ({ body, set }) => {
      const { token, refreshToken, data } = await UserController.registerHandle(
        body as RegisterInput,
      );

      set.cookie = sessionCookies(token, refreshToken, data.id);

      return { success: true, data };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )

  .post(
    "/login",
    async ({ body, set, request }) => {
      const trace = crypto.randomUUID().slice(0, 8);
      const input = body as LoginInput;

      loginDbg("route:login:raw-body", {
        trace,
        fields: dbgFields(input),
        origin: request.headers.get("origin") ?? null,
        contentType: request.headers.get("content-type") ?? null,
      });

      const { token, refreshToken, data, loginKind } =
        await UserController.loginHandle(input);

      const cookies = sessionCookies(token, refreshToken, data.id);
      set.cookie = cookies;

      loginDbg("route:login:response", {
        trace,
        loginKind,
        accountId: data.id,
        username: data.username,
        cookies: Object.keys(cookies).join(","),
      });

      return { success: true, loginKind, data };
    },
    {
      body: t.Object({
        identifier: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
        email: t.Optional(t.String({ format: "email" })),
        username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
        password: t.String({ minLength: 8 }),
      }),
    },
  )

  .post(
    "/login-email",
    async ({ body, set }) => {
      const { token, refreshToken, data } =
        await UserController.loginWithEmailHandle(body as EmailLoginInput);

      set.cookie = sessionCookies(token, refreshToken, data.id);

      return { success: true, data };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )

  .patch(
    "/beBuilder",
    async ({ body }) => {
      return await UserController.beBuilderHandle(body as BeBuilderInput);
    },
    {
      body: t.Object({
        accountId: t.String({ format: "uuid" }),
      }),
    },
  )

  .get(
    "/getUserByUsername/:username",
    async ({ params }) => {
      return await UserController.getByUsernameHandle(
        params as unknown as GetUserByUsernameInput,
      );
    },
    {
      params: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
      }),
    },
  )

  .use(
    new Elysia()
      .use(authMiddleware)
      .patch(
        "/profile",
        async ({ user, body }) => {
          const userId = (user as { userId?: string } | undefined)?.userId;
          if (!userId) throw new AppError("Authentication required", 401);

          return await UserController.updateProfileHandle(
            userId,
            body as UpdateProfileInput,
          );
        },
        {
          body: t.Object({
            username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
            email: t.Optional(t.String({ format: "email", maxLength: 255 })),
          }),
        },
      ),
  );
