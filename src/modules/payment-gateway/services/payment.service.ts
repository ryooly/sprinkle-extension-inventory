import type { GatewayNotificationParams } from "../midtrans/midtrans.service";
import {
  createPaymentService,
  refundPaymentService,
  verifyGatewayNotification,
} from "../midtrans/midtrans.service";
import { AppError } from "@/errorhandler";
import { randomUUID } from "crypto";
import * as PaymentRepository from "../repository/payment.repository";
import type { Plan } from "@/models";

export interface CreatePaymentParams {
  planId: number;
  userId: string;
}

const PLAN_DURATION_DAYS: Record<string, number> = {
  basic: 30,
  pro: 90,
  premium: 365,
};

const PREMIUM_PLAN_NAMES = ["pro", "premium"];

export function resolveDurationInDays(plan: Plan): number {
  const asNumber = Number(plan.durationInDays);

  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  return PLAN_DURATION_DAYS[plan.name] ?? 30;
}

function isPremiumPlan(plan: Plan | null | undefined): boolean {
  return plan !== null && plan !== undefined
    ? PREMIUM_PLAN_NAMES.includes(plan.name)
    : false;
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function toPlanView(plan: Plan) {
  return {
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
    durationInDays: resolveDurationInDays(plan),
    isPremium: isPremiumPlan(plan),
    isActive: plan.isActive === 1,
  };
}

export async function listPlans() {
  const plans = await PaymentRepository.listActivePlans();

  return plans.filter((plan) => plan.isActive === 1).map(toPlanView);
}

export async function getSubscriptionState(userId: string) {
  await PaymentRepository.expireStaleSubscriptions(userId);

  const active = await PaymentRepository.findActiveSubscription(userId);
  const current =
    active ?? (await PaymentRepository.findLatestSubscription(userId));

  if (!current) return { isPremium: false, subscription: null, plan: null };

  const expiresAt = current.subscription.expiresAt ?? null;

  return {
    isPremium: Boolean(active) && isPremiumPlan(current.plan),
    subscription: {
      id: current.subscription.id,
      status: active ? "active" : current.subscription.status,
      createdAt: current.subscription.createdAt,
      expiresAt,
      daysRemaining: expiresAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(expiresAt).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : null,
    },
    plan: toPlanView(current.plan),
  };
}

export async function createPayment(params: CreatePaymentParams) {
  const { planId, userId } = params;

  const plan = await PaymentRepository.getPlanById(planId);

  if (!plan) {
    throw new AppError(`Plan "${planId}" not found`, 404);
  }

  if (!plan.isActive) {
    throw new AppError(`Plan "${planId}" is not available`, 400);
  }

  const user = await PaymentRepository.getAccountById(userId);

  if (!user) {
    throw new AppError(`User "${userId}" not found`, 404);
  }

  const durationInDays = resolveDurationInDays(plan);

  const subscription = await PaymentRepository.insertSubscription({
    userId,
    planId,
    status: "active",
    expiresAt: addDays(durationInDays),
  });

  await PaymentRepository.cancelOtherActiveSubscriptions(
    userId,
    subscription.id,
  );

  const transactionId = `PAY-${subscription.id}-${randomUUID().slice(0, 8)}`;

  let checkout: { token: string; redirectUrl: string } | null = null;

  try {
    const { token, redirectUrl } = await createPaymentService({
      orderId: transactionId,
      amount: Number(plan.price),
      customer: {
        firstName: user.username,
        email: user.email,
      },
      itemDetails: [
        {
          id: String(plan.id),
          price: Number(plan.price),
          quantity: 1,
          name: `${plan.name} (${durationInDays} hari)`,
        },
      ],
    });

    checkout = { token, redirectUrl };
  } catch {
    checkout = null;
  }

  const payment = checkout
    ? await PaymentRepository.insertPayment({
        subscriptionId: subscription.id,
        transactionId,
        snapToken: checkout.token,
        status: "pending",
      })
    : null;

  return {
    subscription,
    plan: toPlanView(plan),
    payment,
    checkout,
    activated: true,
  };
}

export async function cancelSubscription(userId: string) {
  const active = await PaymentRepository.findActiveSubscription(userId);

  if (!active) {
    throw new AppError("No active subscription to cancel", 404);
  }

  const cancelled = await PaymentRepository.updateSubscriptionStatus(
    active.subscription.id,
    "cancelled",
  );

  return { subscription: cancelled, plan: toPlanView(active.plan) };
}

export interface RefundPaymentParams {
  paymentId: number;
  userId: string;
}

export async function refundPayment(params: RefundPaymentParams) {
  const { paymentId, userId } = params;

  const result = await PaymentRepository.getPaymentWithSubscription(paymentId);

  if (!result) {
    throw new AppError(`Payment "${paymentId}" not found`, 404);
  }

  const { payment, subscription } = result;

  if (!subscription) {
    throw new AppError(
      `Subscription for payment "${paymentId}" not found`,
      404,
    );
  }

  if (subscription.userId !== userId) {
    throw new AppError(
      `You don't have permission to refund payment "${paymentId}"`,
      403,
    );
  }

  if (payment.status !== "success") {
    throw new AppError(
      `Payment "${paymentId}" cannot be refunded because its status is "${payment.status}"`,
      400,
    );
  }

  const refundResult = await refundPaymentService({
    transactionId: payment.transactionId,
  });

  const updatedPayment = await PaymentRepository.refundAndCancel(
    paymentId,
    subscription.id,
  );

  if (!updatedPayment) {
    throw new AppError(`Payment "${paymentId}" not found`, 404);
  }

  return {
    payment: updatedPayment,
    refund: refundResult,
  };
}

export async function handleGatewayNotification(
  params: GatewayNotificationParams,
) {
  const { transactionId, paymentMethod, status } =
    await verifyGatewayNotification(params);

  const payment =
    await PaymentRepository.getPaymentByTransactionId(transactionId);

  if (!payment) {
    throw new AppError(
      `Payment with transactionId "${transactionId}" not found`,
      404,
    );
  }

  const updatedPayment = await PaymentRepository.updatePaymentStatus(
    payment.id,
    status,
    paymentMethod,
  );

  if (status === "success") {
    const row = await PaymentRepository.getSubscriptionWithPlan(
      payment.subscriptionId,
    );

    await PaymentRepository.updateSubscriptionStatus(
      payment.subscriptionId,
      "active",
      row ? addDays(resolveDurationInDays(row.plan)) : undefined,
    );
  }

  return { payment: updatedPayment };
}

export async function hasPremiumAccess(userId: string): Promise<boolean> {
  await PaymentRepository.expireStaleSubscriptions(userId);

  const active = await PaymentRepository.findActiveSubscription(userId);

  return Boolean(active) && isPremiumPlan(active?.plan);
}
