import { Elysia } from "elysia";
import { logger } from "@/logger";

import { buildCorsPlugin } from "./cors";
import { AppError } from "@/errorhandler";
import { loginDbg } from "@/modules/auth/utils/loginDebug";
import type { ErrorResponse } from "@/types/error-response";
import { userRoutes } from "@/modules/auth";
import { extensionRoutes } from "@/modules/manual-ekstension";
import { catalogRoutes } from "@/modules/catalog";
import { paymentRoutes } from "@/modules/payment-gateway";
import { extensionMetricsRoutes } from "@/modules/automation-engine";
import { dailyShowcaseRoutes } from "@/modules/dailyShowcase";
import { commentRoutes } from "@/modules/comments";
import { savedExtensionRoutes } from "@/modules/automation-engine/algorithm-engine/routes/saved-extensions.route";

new Elysia()
  .use(buildCorsPlugin())

  .onError(({ code, error, path, set }) => {
    const status =
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    if (
      path.startsWith("/user/") ||
      status === 401 ||
      status === 403 ||
      status === 500 ||
      code === "INTERNAL_SERVER_ERROR" ||
      code === "INVALID_COOKIE_SIGNATURE"
    ) {
      loginDbg("gateway:onError", {
        code: String(code),
        path,
        status,
        message: error instanceof Error ? error.message : String(error),
        details: (error as { details?: unknown }).details ?? null,
      });
    }

    const fail = (status: number, message: string): ErrorResponse => {
      set.status = status;
      return { success: false, message, status };
    };

    if (error instanceof AppError) return fail(error.status, error.message);

    if (code === "NOT_FOUND") return fail(404, "Resource not found");
    if (code === "VALIDATION" || code === "PARSE")
      return fail(400, "Request validation failed");

    const failStatus = status ?? 500;

    if (failStatus >= 500) {
      logger.error(
        `[gateway] unhandled error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return fail(failStatus, "Internal server error");
    }

    return fail(
      failStatus,
      error instanceof Error && error.message
        ? error.message
        : "Request failed",
    );
  })
  .use(userRoutes)
  .use(extensionRoutes)
  .use(catalogRoutes)
  .use(paymentRoutes)
  .use(extensionMetricsRoutes)
  .use(dailyShowcaseRoutes)
  .use(commentRoutes)
  .use(savedExtensionRoutes)
  .listen(3000);

logger.info("Gateway running at http://localhost:3000");
