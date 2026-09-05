import Elysia, { t } from "elysia";
import * as PaymentController from "../controller/payment.controller";
import { authMiddleware } from "@/middlewares/auth-middleware";

export const paymentRoutes = new Elysia({ prefix: "/payment" })
  // Midtrans payment notification (server-to-server webhook). Registered before
  // authMiddleware on purpose: Midtrans sends no session cookies, and the call
  // is authenticated by `signature_key` inside verifyGatewayNotification().
  .post(
    "/gateway",
    async ({ body }) => {
      return await PaymentController.gatewayHandle(body);
    },
    {
      body: t.Object({
        order_id: t.String(),
        transaction_id: t.String(),
        transaction_status: t.String(),
        payment_type: t.String(),
        gross_amount: t.String(),
        status_code: t.String(),
        signature_key: t.String(),
      }),
    },
  )

  .use(authMiddleware)

  .post(
    "/create",
    async ({ body, user }) => {
      return await PaymentController.createHandle({
        planId: body.planId,
        userId: user.userId,
      });
    },
    {
      body: t.Object({
        planId: t.Number(),
      }),
    },
  )

  .post(
    "/refund",
    async ({ body, user }) => {
      return await PaymentController.refundHandle({
        paymentId: body.paymentId,
        userId: user.userId,
      });
    },
    {
      body: t.Object({
        paymentId: t.Number(),
      }),
    },
  );
