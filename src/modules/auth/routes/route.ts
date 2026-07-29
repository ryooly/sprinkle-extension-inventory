import Elysia, { t } from "elysia";
import { UserController } from "@/modules/auth/controller/controller";
import { cookie } from "@elysiajs/cookie";

export const userRoutes = new Elysia({ prefix: "/user" })
  .use(cookie())
  .post(
    "/register",
    async ({ body, setCookie }) => {
      const { token, data } = await UserController.registerHandle(body);

      setCookie("auth", token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 15,
        sameSite: "strict",
      });

      setCookie("accountId", data.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });

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
    async ({ body, setCookie }) => {
      const { token, data } = await UserController.loginHandle(body);

      setCookie("auth", token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 15,
        sameSite: "strict",
      });

      setCookie("accountId", data.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });

      return { success: true, data };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )

  .patch(
    "/beBuilder",
    async ({ body }) => {
      return await UserController.beBuilderHandle(body);
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
      return await UserController.getByUsernameHandle(params);
    },
    {
      params: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
      }),
    },
  );
