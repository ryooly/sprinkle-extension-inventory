import { Elysia } from "elysia";
import { UserRepository } from "../modules/auth/repository/auth-repository";
import { AppError } from "./errorHandler";

type AuthContext = {
  user?: {
    userId: string;
  };
};

export const builderMiddleware = new Elysia().derive(async (ctx) => {
  const { user } = ctx as typeof ctx & AuthContext;
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  const account = await UserRepository.findUserById({ id: user.userId });

  if (!account) {
    throw new AppError("User not found", 401);
  }

  if (account.role !== "builder") {
    throw new AppError("Forbidden", 403);
  }

  return {};
})
  // See auth-middleware.ts: `.as("scoped")` is required, otherwise this derive
  // stays local to the plugin and never guards the routes that `.use()` it.
  .as("scoped");
