import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { plans, subscriptions, payments } from "../db/schema";
import { accounts } from "@/modules/auth/db/schema";

export async function getPlanById(planId: number) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  return plan;
}

export async function getAccountById(userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, userId));
  return account;
}

export async function insertSubscription(data: {
  userId: string;
  planId: number;
  status: "pending" | "active" | "expired" | "cancelled";
}) {
  const [subscription] = await db
    .insert(subscriptions)
    .values(data)
    .returning();
  return subscription;
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: "pending" | "active" | "expired" | "cancelled",
) {
  const [subscription] = await db
    .update(subscriptions)
    .set({ status })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();
  return subscription;
}

export async function getUserSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    );

  return subscription ?? null;
}

export async function insertPayment(data: {
  subscriptionId: string;
  transactionId: string;
  snapToken: string;
  status: "pending" | "success" | "failed" | "refunded";
}) {
  const [payment] = await db.insert(payments).values(data).returning();
  return payment;
}

export async function getPaymentById(paymentId: number) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));
  return payment;
}

export async function getPaymentByTransactionId(transactionId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, transactionId));
  return payment;
}

export async function getPaymentWithSubscription(paymentId: number) {
  const [result] = await db
    .select({ payment: payments, subscription: subscriptions })
    .from(payments)
    .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .where(eq(payments.id, paymentId));
  return result;
}

export async function updatePaymentStatus(
  paymentId: number,
  status: "pending" | "success" | "failed" | "refunded",
  paymentMethod?: string,
) {
  const [payment] = await db
    .update(payments)
    .set({ status, ...(paymentMethod && { paymentMethod }), updatedAt: new Date() })
    .where(eq(payments.id, paymentId))
    .returning();
  return payment;
}

export async function refundAndCancel(
  paymentId: number,
  subscriptionId: string,
) {
  return await db.transaction(async (tx) => {
    const [updatedPayment] = await tx
      .update(payments)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();

    await tx
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(eq(subscriptions.id, subscriptionId));

    return updatedPayment;
  });
}


// Massage (ubah status valudation dengan mebuat vairable berisi statusnya jadi kita gak perlu lagi yanng namanya menuliskan ulang)