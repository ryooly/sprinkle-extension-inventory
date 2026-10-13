import { Elysia } from "elysia";
import { getUserSubscription } from "@/modules/payment-gateway/repository/payment.repository";
import { AppError } from "@/errorhandler";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription !== null;
}
