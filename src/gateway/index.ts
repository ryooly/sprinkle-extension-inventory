// gateway/index.ts
import { Elysia } from "elysia";

import { buildCorsPlugin } from "./cors";
import { AppError } from "@/middlewares/errorHandler";
import type { ErrorResponse } from "@/types/error-response";
import { userRoutes } from "@/modules/auth";
import { extensionRoutes } from "@/modules/manual-ekstension";
import { paymentRoutes } from "@/modules/payment-gateway";
import { extensionMetricsRoutes } from "@/modules/automation-engine";
import { dailyShowcaseRoutes } from "@/modules/dailyShowcase";

const app = new Elysia()
  .use(buildCorsPlugin())

  .onError(({ code, error, set }) => {
    const fail = (status: number, message: string): ErrorResponse => {
      set.status = status;
      return { success: false, message, status };
    };

    if (error instanceof AppError) return fail(error.status, error.message);

    if (code === "NOT_FOUND") return fail(404, "Resource not found");
    if (code === "VALIDATION" || code === "PARSE")
      return fail(400, "Request validation failed");

    const status =
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

    if (status >= 500) {
      console.error("[gateway] unhandled error:", error);
      return fail(status, "Internal server error");
    }

    return fail(
      status,
      error instanceof Error && error.message
        ? error.message
        : "Request failed",
    );
  })
  .use(userRoutes)
  .use(extensionRoutes)
  .use(paymentRoutes)
  .use(extensionMetricsRoutes)
  .use(dailyShowcaseRoutes)
  .listen(3000);

console.log("Gateway running at http://localhost:3000");
