import { Elysia, t } from "elysia";
import { AppError } from "@/errorhandler";
import {
  handleGetCatalogExtension,
  handleGetCatalogExtensionBundle,
  handleListCatalogExtensions,
} from "../controller/controller";

export const catalogRoutes = new Elysia({ prefix: "/extensions" })
  .get(
    "/",
    async ({ query }) => {
      return await handleListCatalogExtensions(query);
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        category: t.Optional(t.String()),
        browser: t.Optional(t.String()),
        publisher: t.Optional(t.String()),
        developer: t.Optional(t.String()),
        name: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )

  .get(
    "/:id",
    async ({ params }) => {
      return await handleGetCatalogExtension(params.id);
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    },
  )

  .get(
    "/:id/bundle",
    async ({ params, set }) => {
      const result = await handleGetCatalogExtensionBundle(params.id);
      const bundle = result.data;

      if (!bundle) throw new AppError("Download unavailable", 404);

      if (bundle.redirectUrl) {
        set.status = 302;
        set.headers.location = bundle.redirectUrl;
        return "";
      }

      set.headers["content-type"] = "application/zip";
      set.headers["content-disposition"] =
        `attachment; filename="${bundle.fileName}"`;

      return Bun.file(bundle.filePath as string);
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    },
  );
