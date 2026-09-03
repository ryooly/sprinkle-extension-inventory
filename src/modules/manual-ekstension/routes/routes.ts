import { Elysia, t } from "elysia";
import { z } from "zod";
import {
  createExtensionSchema,
  updateExtensionSchema,
  categorySchema,
  browserSchema,
} from "../schemas/request-validator";
import {
  handleCreateExtension,
  handleEditExtension,
  handleRemoveExtension,
  handleSearchExtensionsByName,
  handleSearchExtensionsByCategory,
  handleSearchExtensionsByBrowser,
} from "../controller/controller";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { builderMiddleware } from "@/middlewares/builder-middlewares";

export const extensionRoutes = new Elysia({ prefix: "/extensions" })
  .use(authMiddleware)
  .use(builderMiddleware)
  .post(
    "/creating",
    async ({ body }) => {
      const result = await handleCreateExtension(body);
      return result;
    },
    { body: createExtensionSchema },
  )

  .patch(
    "/:id",
    async ({ params, body }) => {
      const { categories, ...data } = body;
      const result = await handleEditExtension({
        id: params.id,
        data,
        categories,
      });
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateExtensionSchema,
    },
  )

  .delete(
    "/:id",
    async ({ params }) => {
      const result = await handleRemoveExtension(params.id);
      return result;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    },
  )

  .get(
    "/search/by-name",
    async ({ query }) => {
      const result = await handleSearchExtensionsByName(query.name);
      return result;
    },
    { query: t.Object({ name: t.String() }) },
  )

  .post(
    "/search/by-category",
    async ({ body }) => {
      const result = await handleSearchExtensionsByCategory(body.category);
      return result;
    },
    {
      body: t.Object({
        category: categorySchema,
      }),
    },
  )

  .post(
    "/search/by-browser",
    async ({ body }) => {
      const result = await handleSearchExtensionsByBrowser(body.browser);
      return result;
    },
    {
      body: t.Object({
        browser: browserSchema,
      }),
    },
  );
