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
});

export const createExtensionAutomationSchema = t.Object({
  name: t.String(),
  description: t.String(),
  developer: t.String(),
  extensionLink: t.String({ format: "uri", pattern: "\\.zip$" }),
  source: t.Optional(sourceSchema),
  categories: t.Array(categorySchema),
  supportedBrowsers: t.Array(browserSchema),
});

export const updateExtensionSchema = t.Object({
  name: t.Optional(t.String()),
  description: t.Optional(t.String()),
  categories: t.Optional(t.Array(categorySchema)),
});
