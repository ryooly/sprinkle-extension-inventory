import { Elysia, t } from "elysia";
import {
  handleIncrementView,
  handleIncrementDownload,
  handleIncrementAmountDisplayed,
} from "../controller/controller";

export const extensionMetricsRoutes = new Elysia({ prefix: "/extensions" })
  .post(
    "/:id/view",
    async ({ params }) => {
      const result = await handleIncrementView(params.id);

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    "/:id/download",
    async ({ params }) => {
      const result = await handleIncrementDownload(params.id);

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    "/:id/displayed",
    async ({ params }) => {
      const result = await handleIncrementAmountDisplayed(params.id);

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
