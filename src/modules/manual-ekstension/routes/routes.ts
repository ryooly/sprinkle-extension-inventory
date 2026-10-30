import { Elysia, t } from "elysia";
import {
  createExtensionUserSchema,
  updateExtensionSchema,
  categorySchema,
  browserSchema,
  normaliseList,
} from "@/schemas/extension-validator";
import {
  handleCreateExtension,
  handleEditExtension,
  handleRemoveExtension,
  handleSearchExtensionsByName,
  handleSearchExtensionsByCategory,
  handleSearchExtensionsByHashtag,
  handleSearchExtensionsByBrowser,
  handleOpenExtensionFile,
} from "../controller/controller";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { builderMiddleware } from "@/middlewares/builder-middlewares";

const builderRoutes = new Elysia()
  .use(builderMiddleware)
  .post(
    "/creating",
    async ({ body }) => {
      const result = await handleCreateExtension(body);
      return result;
    },
    {
      body: createExtensionUserSchema,
      // Multipart sends a single picked value as a plain string, and Elysia
      // only coerces that shape for arrays of primitives, so normalise the
      // literal unions here. Keeps "one category / one browser" uploads valid.
      transform({ body }) {
        normaliseList(body, "categories");
        normaliseList(body, "supportedBrowsers");
        normaliseList(body, "hashtags");
      },
    },
  )

  .patch(
    "/:id",
    async ({ params, body }) => {
      const { categories, hashtags, ...data } = body;
      const result = await handleEditExtension({
        id: params.id,
        data,
        categories,
        hashtags,
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
  );

export const extensionRoutes = new Elysia({ prefix: "/extensions" })
  .use(authMiddleware)
  .use(builderRoutes)

  .get(
    "/search/by-name",
    async ({ query }) => {
      const result = await handleSearchExtensionsByName(query.name);
      return result;
    },
    {
      query: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
      }),
    },
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
    "/search/by-hashtag",
    async ({ body }) => {
      const result = await handleSearchExtensionsByHashtag(body.hashtag);
      return result;
    },
    {
      body: t.Object({
        hashtag: t.String({ minLength: 1, maxLength: 50 }),
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
  )

  .get(
    "/:id/file",
    async ({ params, query }) => {
      const result = await handleOpenExtensionFile(params.id, query.path);
      return result;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      query: t.Object({
        path: t.String({ minLength: 1, maxLength: 255 }),
      }),
    },
  );
