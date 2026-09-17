import { describe, expect, test } from "bun:test";
import crypto from "crypto";
import { AppError } from "../src/middlewares/errorHandler";

const SERVER_KEY = "SB-Mid-server-UnitTest123";
process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;
process.env.MIDTRANS_CLIENT_KEY = "SB-Mid-client-UnitTest123";

const { verifyGatewayNotification } =
  await import("../src/modules/payment-gateway/midtrans/midtrans.service");

interface Params {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  payment_type: string;
  gross_amount: string;
  status_code: string;
  signature_key: string;
}

function sign(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  key = SERVER_KEY,
): string {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${key}`)
    .digest("hex");
}

function notification(overrides: Partial<Params> = {}): Params {
  const merged: Params = {
    order_id: "PAY-1000-abc",
    transaction_id: "txn-1000",
    transaction_status: "settlement",
    payment_type: "bank_transfer",
    gross_amount: "99000.00",
    status_code: "200",
    signature_key: "",
    ...overrides,
  };
  if (!merged.signature_key) {
    merged.signature_key = sign(
      merged.order_id,
      merged.status_code,
      merged.gross_amount,
    );
  }
  return merged;
}

describe("verifyGatewayNotification – signature", () => {
  test("accepts a correctly signed notification", async () => {
    const result = await verifyGatewayNotification(notification());
    expect(result.transactionId).toBe("PAY-1000-abc");
    expect(result.paymentMethod).toBe("bank_transfer");
    expect(result.status).toBe("success");
  });

  test("rejects a forged signature with AppError 403", async () => {
    const err = await verifyGatewayNotification(
      notification({ signature_key: "0".repeat(128) }),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(403);
    expect((err as AppError).message).toMatch(/signature/i);
  });

  test("rejects a payload whose gross_amount was altered after signing", async () => {
    const tampered = { ...notification(), gross_amount: "1.00" };
    const err = await verifyGatewayNotification(tampered).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(403);
  });

  test("rejects when signed with a different server key", async () => {
    const wrongKeySig = sign(
      "PAY-1000-abc",
      "200",
      "99000.00",
      "SB-Mid-server-Other",
    );
    const err = await verifyGatewayNotification(
      notification({ signature_key: wrongKeySig }),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(403);
  });
});

describe("verifyGatewayNotification – status mapping", () => {
  const cases: Array<[string, "success" | "failed" | "pending"]> = [
    ["settlement", "success"],
    ["capture", "success"],
    ["expire", "failed"],
    ["cancel", "failed"],
    ["deny", "failed"],
    ["pending", "pending"],
    ["whatever_unknown", "pending"],
  ];

  for (const [transactionStatus, expected] of cases) {
    test(`${transactionStatus} → ${expected}`, async () => {
      const result = await verifyGatewayNotification(
        notification({ transaction_status: transactionStatus }),
      );
      expect(result.status).toBe(expected);
    });
  }
});
