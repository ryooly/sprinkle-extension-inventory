import Elysia, { t } from "elysia";
import { UserController } from "@/modules/auth/controller/controller";
import { getCookiePolicy } from "@/middlewares/cookie-policy";
import type {
  RegisterInput,
  LoginInput,
  EmailLoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
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
      maxAge: 60 * 15,
      sameSite,
    },
    accountId: {
      value: accountId,
      httpOnly: true,
      secure,
      sameSite,
    },
    refreshToken: {
      value: refreshToken,
      httpOnly: true,
      secure,
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
    async ({ body, set }) => {
      const { token, refreshToken, data } = await UserController.loginHandle(
        body as LoginInput,
      );

      set.cookie = sessionCookies(token, refreshToken, data.id);

      return { success: true, data };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
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
  );
