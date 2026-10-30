import { and, desc, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { plans, subscriptions, payments, accounts } from "@/models";

export async function listActivePlans() {
  return await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, 1))
    .orderBy(plans.id);
}

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
  expiresAt?: Date | null;
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
  expiresAt?: Date | null,
) {
  const [subscription] = await db
    .update(subscriptions)
    .set({
      status,
      ...(expiresAt !== undefined && { expiresAt }),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();
  return subscription;
}

export async function findActiveSubscription(userId: string) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        or(
          isNull(subscriptions.expiresAt),
          gt(subscriptions.expiresAt, new Date()),
        ),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return row;
}

export async function getSubscriptionWithPlan(subscriptionId: string) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  return row;
}

export async function findLatestSubscription(userId: string) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return row;
}

export async function expireStaleSubscriptions(userId: string) {
  return await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        lt(subscriptions.expiresAt, new Date()),
      ),
    );
}

export async function cancelOtherActiveSubscriptions(
  userId: string,
  keepSubscriptionId: string,
) {
  return await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        ne(subscriptions.id, keepSubscriptionId),
      ),
    );
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
    .set({
      status,
      ...(paymentMethod && { paymentMethod }),
      updatedAt: new Date(),
    })
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
