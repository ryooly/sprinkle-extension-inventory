import { t } from "elysia";

export const categorySchema = t.Union([
  t.Literal("productivity"),
  t.Literal("developer_tools"),
  t.Literal("communication"),
  t.Literal("design"),
  t.Literal("finance"),
  t.Literal("security"),
  t.Literal("education"),
  t.Literal("entertainment"),
  t.Literal("social"),
  t.Literal("utilities"),
  t.Literal("general"),
  t.Literal("misc"),
  t.Literal("other"),
]);

const sourceSchema = t.Union([
  t.Literal("github"),
  t.Literal("gitlab"),
  t.Literal("bitbucket"),
  t.Literal("other"),
]);

export const browserSchema = t.Union([
  t.Literal("chrome"),
  t.Literal("opera"),
  t.Literal("edge"),
  t.Literal("firefox"),
  t.Literal("safari"),
]);

export const createExtensionUserSchema = t.Object({
  name: t.String(),
  description: t.String(),
  developer: t.String(),
  file: t.File({
    type: ["application/zip", "application/x-zip-compressed"],
  }),
  source: t.Optional(sourceSchema),
  categories: t.Array(categorySchema),
  supportedBrowsers: t.Array(browserSchema),
  hashtags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }))),
});

export const updateExtensionSchema = t.Object({
  name: t.Optional(t.String()),
  description: t.Optional(t.String()),
  categories: t.Optional(t.Array(categorySchema)),
  hashtags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }))),
});

/**
 * Multipart bodies arrive as strings when a field has a single value, and
 * Elysia only coerces that shape for arrays of primitives. Literal-union
 * arrays need wrapping, so one picked category/browser validates the same
 * as several.
 */
export function normaliseList<T extends object, K extends keyof T>(
  body: T,
  key: K,
): void {
  const value = body[key];
  if (typeof value === "string") body[key] = [value] as T[K];
}
