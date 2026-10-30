import * as PaymentRepository from "../services/payment.service";
import { AppError } from "@/errorhandler";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export interface CreatePaymentBody {
  planId: number;
  userId: string;
}

export interface RefundPaymentBody {
  paymentId: number;
  userId: string;
}

export interface GatewayNotificationBody {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  payment_type: string;
  gross_amount: string;
  status_code: string;
  signature_key: string;
}

export async function createHandle(
  body: CreatePaymentBody,
): Promise<ControllerResult<unknown>> {
  try {
    const payment = await PaymentRepository.createPayment(body);

    return { success: true, data: payment };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to create payment for plan "${body.planId}"`,
      500,
      { cause: err },
    );
  }
}

export async function refundHandle(
  body: RefundPaymentBody,
): Promise<ControllerResult<unknown>> {
  try {
    const refunded = await PaymentRepository.refundPayment(body);

    return { success: true, data: refunded };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to refund payment "${body.paymentId}"`, 500, {
      cause: err,
    });
  }
}

export async function gatewayHandle(
  body: GatewayNotificationBody,
): Promise<ControllerResult<unknown>> {
  try {
    const result = await PaymentRepository.handleGatewayNotification(body);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to process gateway callback for "${body.order_id}"`,
      500,
      { cause: err },
    );
  }
}

export async function listPlansHandle(): Promise<ControllerResult<unknown>> {
  try {
    const data = await PaymentRepository.listPlans();

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to list plans", 500, { cause: err });
  }
}

export async function subscriptionHandle(
  userId: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await PaymentRepository.getSubscriptionState(userId);

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to load subscription for "${userId}"`, 500, {
      cause: err,
    });
  }
}

export async function cancelHandle(
  userId: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await PaymentRepository.cancelSubscription(userId);

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to cancel subscription for "${userId}"`, 500, {
      cause: err,
    });
  }
}

export async function premiumAccessHandle(
  userId: string,
): Promise<boolean> {
  try {
    return await PaymentRepository.hasPremiumAccess(userId);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to verify premium access for "${userId}"`, 500, {
      cause: err,
    });
  }
}
