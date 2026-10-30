import { Elysia } from "elysia";
import { AppError } from "@/errorhandler";
import { hasPremiumAccess } from "@/modules/payment-gateway/services/payment.service";

type AuthContext = {
  user?: {
    userId: string;
  };
};

export const premiumMiddleware = new Elysia().derive(async (ctx) => {
  const { user } = ctx as typeof ctx & AuthContext;

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  const granted = await hasPremiumAccess(user.userId);

  if (!granted) {
    throw new AppError("Premium subscription required", 403);
  }

  return {};
})

  .as("scoped");
