import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middlewares/auth-middleware";
import {
  handleGetDailyShowcase,
  handleGetPremiumShowcase,
} from "../controller/controller";

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
