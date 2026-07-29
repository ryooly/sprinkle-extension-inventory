import midtransClient from "midtrans-client";
import { AppError } from "@/middlewares/errorHandler";
import { snap } from "./midtrans";
import crypto from "crypto";

export interface CreatePaymentServiceParams {
  orderId: string;
  amount: number;
  customer?: {
    firstName?: string;
    email?: string;
    phone?: string;
  };
  itemDetails?: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
}

export interface CreatePaymentServiceResult {
  token: string;
  redirectUrl: string;
}

export async function createPaymentService(
  params: CreatePaymentServiceParams,
): Promise<CreatePaymentServiceResult> {
  const { orderId, amount, customer, itemDetails } = params;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    ...(customer && {
      customer_details: {
        first_name: customer.firstName,
        email: customer.email,
        phone: customer.phone,
      },
    }),
    ...(itemDetails && {
      item_details: itemDetails.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
    }),
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    return {
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    };
  } catch (err) {
    throw new AppError(
      `Failed to create Midtrans transaction for order "${orderId}"`,
      500,
      { cause: err },
    );
  }
}

const core = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY as string,
  clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
});

export interface RefundPaymentServiceParams {
  transactionId: string;
  amount?: number;
}

export async function refundPaymentService(params: RefundPaymentServiceParams) {
  const { transactionId, amount } = params;

  try {
    const result = await core.transaction.refund(transactionId, {
      refund_key: `REFUND-${transactionId}-${Date.now()}`,
      amount,
    });

    return result;
  } catch (err) {
    throw new AppError(
      `Failed to refund Midtrans transaction "${transactionId}"`,
      500,
      { cause: err },
    );
  }
}

export interface GatewayNotificationParams {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  payment_type: string;
  gross_amount: string;
  status_code: string;
  signature_key: string;
}

export async function verifyGatewayNotification(
  params: GatewayNotificationParams,
) {
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    payment_type,
  } = params;

  const expectedSignature = crypto
    .createHash("sha512")
    .update(
      `${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`,
    )
    .digest("hex");

  if (expectedSignature !== signature_key) {
    throw new AppError("Invalid Midtrans signature", 403);
  }

  let mappedStatus: "success" | "failed" | "pending";

  if (transaction_status === "settlement" || transaction_status === "capture") {
    mappedStatus = "success";
  } else if (
    transaction_status === "expire" ||
    transaction_status === "cancel" ||
    transaction_status === "deny"
  ) {
    mappedStatus = "failed";
  } else {
    mappedStatus = "pending";
  }

  return {
    transactionId: order_id,
    paymentMethod: payment_type,
    status: mappedStatus,
  };
}
