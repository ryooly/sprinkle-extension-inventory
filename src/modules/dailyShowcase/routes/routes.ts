import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middlewares/auth-middleware";
import {
  handleGetDailyShowcase,
  handleGetPremiumShowcase,
} from "../controller/controller";

/**
 * Delivery endpoints for the frontend.
 *   GET /showcase                 -> latest day's showcased extensions (public:
 *                                    guests + free users see the same basic set)
 *   GET /showcase?date=YYYY-MM-DD  -> a specific day's showcased extensions
 *   GET /showcase/premium         -> the same showcased set, enriched on demand
 *                                    by the AI brain. Authenticated + premium
 *                                    verified; non-premium callers get 403.
 */
export const dailyShowcaseRoutes = new Elysia({ prefix: "/showcase" })
  .get(
    "/",
    async ({ query }) => {
      return await handleGetDailyShowcase(query.date);
    },
    {
      query: t.Object({
        date: t.Optional(t.String()),
      }),
    },
  )
  // Registered after the public route: `authMiddleware` is scoped, so it only
  // guards the routes chained below it, leaving `GET /showcase` public.
  .use(authMiddleware)
  .get(
    "/premium",
    async ({ user, query }) => {
      const userId = (user as { userId?: string } | undefined)?.userId;
      return await handleGetPremiumShowcase(userId, query.date);
    },
    {
      query: t.Object({
        date: t.Optional(t.String()),
      }),
    },
  );
