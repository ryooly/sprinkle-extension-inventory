import * as PaymentRepository from "../services/payment.service";
import { AppError } from "@/middlewares/errorHandler";

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
