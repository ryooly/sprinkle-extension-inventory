import type { GatewayNotificationParams } from "../midtrans/midtrans.service";
import {
  createPaymentService,
  refundPaymentService,
  verifyGatewayNotification,
} from "../midtrans/midtrans.service";
import { AppError } from "@/middlewares/errorHandler";
import { randomUUID } from "crypto";
import * as PaymentRepository from "../repository/payment.repository";

export interface CreatePaymentParams {
  planId: number;
  userId: string;
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

  const subscription = await PaymentRepository.insertSubscription({
    userId,
    planId,
    status: "pending",
  });

  const transactionId = `PAY-${subscription.id}-${randomUUID().slice(0, 8)}`;

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
        name: `${plan.name} (${plan.durationInDays} hari)`,
      },
    ],
  });

  const payment = await PaymentRepository.insertPayment({
    subscriptionId: subscription.id,
    transactionId,
    snapToken: token,
    status: "pending",
  });

  return {
    subscription,
    payment,
    token,
    redirectUrl,
  };
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
    await PaymentRepository.updateSubscriptionStatus(
      payment.subscriptionId,
      "active",
    );
  }

  return { payment: updatedPayment };
}
