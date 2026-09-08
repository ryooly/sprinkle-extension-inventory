// cli/commands/payment.ts
//
// Payment-gateway endpoints (backend prefix `/payment`):
//   POST /payment/create   → start a subscription/payment (requires auth)
//   POST /payment/refund   → refund a payment (requires auth)
//   POST /payment/gateway  → Midtrans server-to-server webhook (public; the
//                             backend verifies `signature_key` itself)
//
// The webhook needs a signature that only Midtrans can produce, so
// `payment-gateway` is mainly for replaying a captured payload (--file) to
// confirm the route + verification logic respond as expected.

import * as fs from "node:fs";
import { http, errorMessage, type HttpResult } from "../lib/http";
import { loadSession } from "../lib/session";
import * as out from "../lib/output";
import { str, int } from "../lib/args";
import type { CommandDef, CommandContext } from "../lib/util";

function bodyOf(res: HttpResult): Record<string, unknown> {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Record<
    string,
    unknown
  >;
}

function requireSession(): boolean {
  const s = loadSession();
  if (!s || (!s.auth && !s.accountId)) {
    out.warn(
      "Not logged in — payment create/refund require an authenticated session.",
    );
    return false;
  }
  return true;
}

async function createPayment(ctx: CommandContext): Promise<void> {
  if (!requireSession()) {
    process.exitCode = 1;
    return;
  }
  const planId = int(ctx.flags, "plan") ?? int(ctx.flags, "plan-id");
  if (planId === undefined) {
    out.error("Usage: payment-create --plan <planId:number>");
    process.exitCode = 1;
    return;
  }

  const res = await http.post(
    "/payment/create",
    { planId },
    { useSession: true },
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    out.heading("Payment created");
    out.success(`Checkout started for plan ${planId}`);
    out.fields({
      redirectUrl: data?.redirectUrl,
      snapToken: data?.token,
      subscription: data?.subscription
        ? JSON.stringify(data.subscription)
        : undefined,
      payment: data?.payment ? JSON.stringify(data.payment) : undefined,
    });
    if (data?.redirectUrl)
      out.info(`Open the redirectUrl in a browser to complete payment.`);
  } else {
    out.error(`payment-create failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function refundPayment(ctx: CommandContext): Promise<void> {
  if (!requireSession()) {
    process.exitCode = 1;
    return;
  }
  const paymentId = int(ctx.flags, "payment") ?? int(ctx.flags, "payment-id");
  if (paymentId === undefined) {
    out.error("Usage: payment-refund --payment <paymentId:number>");
    process.exitCode = 1;
    return;
  }

  const res = await http.post(
    "/payment/refund",
    { paymentId },
    { useSession: true },
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Payment refunded");
    out.success(`Refunded payment ${paymentId}`);
    out.json(bodyOf(res).data);
  } else {
    out.error(`payment-refund failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function gateway(ctx: CommandContext): Promise<void> {
  const file = str(ctx.flags, "file");
  let payload: Record<string, unknown>;

  if (file) {
    try {
      payload = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
        string,
        unknown
      >;
    } catch (err) {
      out.error(
        `Could not read/parse --file ${file}: ${err instanceof Error ? err.message : err}`,
      );
      process.exitCode = 1;
      return;
    }
  } else {
    const required = [
      "order-id",
      "transaction-id",
      "status",
      "type",
      "amount",
      "status-code",
      "signature",
    ] as const;
    const mapped: Record<string, string> = {
      "order-id": "order_id",
      "transaction-id": "transaction_id",
      status: "transaction_status",
      type: "payment_type",
      amount: "gross_amount",
      "status-code": "status_code",
      signature: "signature_key",
    };
    payload = {};
    for (const flag of required) {
      const v = str(ctx.flags, flag);
      if (!v) {
        out.error(
          "Provide a captured payload with --file <json>, or all of: " +
            required.map((r) => `--${r}`).join(" "),
        );
        process.exitCode = 1;
        return;
      }
      payload[mapped[flag]] = v;
    }
  }

  const res = await http.post("/payment/gateway", payload);
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Gateway webhook accepted");
    out.success("Backend processed the notification");
    out.json(bodyOf(res).data);
  } else {
    out.error(`gateway failed (${res.status}): ${errorMessage(res)}`);
    out.info(
      "A signature mismatch is expected unless this is a genuine Midtrans payload.",
    );
    process.exitCode = 1;
  }
}

export const paymentCommands: CommandDef[] = [
  {
    name: "payment-create",
    group: "payment",
    summary: "Create a payment/subscription (POST /payment/create)",
    usage: "payment-create --plan <planId>",
    handler: createPayment,
  },
  {
    name: "payment-refund",
    group: "payment",
    summary: "Refund a payment (POST /payment/refund)",
    usage: "payment-refund --payment <paymentId>",
    handler: refundPayment,
  },
  {
    name: "payment-gateway",
    group: "payment",
    summary: "Replay a Midtrans webhook (POST /payment/gateway)",
    usage:
      "payment-gateway --file <payload.json> | --order-id --transaction-id --status --type --amount --status-code --signature",
    handler: gateway,
  },
];
