import Elysia, { t } from "elysia";
import { UserController } from "@/modules/auth/controller/controller";
import type {
  RegisterInput,
  LoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
} from "@/modules/auth/schemas/auth-schema";

export const userRoutes = new Elysia({ prefix: "/user" })
  .post(
    "/register",
    async ({ body, set }) => {
      const { token, refreshToken, data } = await UserController.registerHandle(
        body as RegisterInput,
      );

      set.cookie = {
        auth: {
          value: token,
          httpOnly: true,
          secure: true,
          maxAge: 60 * 15,
          sameSite: "strict",
        },
        accountId: {
          value: data.id,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        },
        refreshToken: {
          value: refreshToken,
          httpOnly: true,
          secure: true,
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "strict",
        },
      };

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

      set.cookie = {
        auth: {
          value: token,
          httpOnly: true,
          secure: true,
          maxAge: 60 * 15,
          sameSite: "strict",
        },
        accountId: {
          value: data.id,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        },
        refreshToken: {
          value: refreshToken,
          httpOnly: true,
          secure: true,
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "strict",
        },
      };

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
    // nanti menggunakan cooked aja sehingga verifikasi hanya jadi pelengkap aja (tidak perlu)
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
