import { Elysia, t } from "elysia";
import { handleGetDailyShowcase } from "../controller/controller";

/**
 * Public delivery endpoint for the frontend.
 *   GET /showcase              -> latest day's showcased extensions
 *   GET /showcase?date=YYYY-MM-DD -> a specific day's showcased extensions
 */
export const dailyShowcaseRoutes = new Elysia({ prefix: "/showcase" }).get(
  "/",
  async ({ query }) => {
    return await handleGetDailyShowcase(query.date);
  },
  {
    query: t.Object({
      date: t.Optional(t.String()),
    }),
  },
);
