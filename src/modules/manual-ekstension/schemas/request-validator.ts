// routes/extension.routes.ts
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
]);

const verifiedSchema = t.Union([
  t.Literal("verified"),
  t.Literal("not_verified"),
]);

export const createExtensionSchema = t.Object({
  name: t.String(),
  description: t.String(),
  developer: t.String(),
  extensionLink: t.String({ format: "uri" }),
  source: t.Optional(sourceSchema),
  verified: t.Optional(verifiedSchema),
  categories: t.Array(categorySchema),
  browser: browserSchema,
});

export const updateExtensionSchema = t.Object({
  name: t.Optional(t.String()),
  description: t.Optional(t.String()),
  developer: t.Optional(t.String()),
  extensionLink: t.Optional(t.String({ format: "uri" })),
  source: t.Optional(sourceSchema),
  verified: t.Optional(verifiedSchema),
  categories: t.Optional(t.Array(categorySchema)),
});


/// GANTI JADI ZOD
