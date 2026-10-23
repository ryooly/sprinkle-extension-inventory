import { z } from "zod";

export const categorySchema = z.enum([
  "productivity",
  "developer_tools",
  "communication",
  "design",
  "finance",
  "security",
  "education",
  "entertainment",
  "social",
  "utilities",
  "general",
  "misc",
  "other",
]);

export const sourceSchema = z.enum(["github", "gitlab", "bitbucket", "other"]);

export const browserSchema = z.enum([
  "chrome",
  "opera",
  "edge",
  "firefox",
  "safari",
]);

export type BrowserInput = z.infer<typeof browserSchema>;

export const createExtensionSchema = z.object({
  name: z.string(),
  description: z.string(),
  developer: z.string(),
  extensionLink: z.string().url(),
  source: sourceSchema.optional(),
  categories: z.array(categorySchema),
  supportedBrowsers: z.array(browserSchema).default(["chrome"]),
});

export type CreateExtensionPayload = z.infer<typeof createExtensionSchema>;

export const updateExtensionDataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  developer: z.string().optional(),
  extensionLink: z.string().url().optional(),
  source: sourceSchema.optional(),
  supportedBrowsers: z.array(browserSchema).optional(),
});

export const updateExtensionSchema = z.object({
  id: z.string().uuid(),
  data: updateExtensionDataSchema,
  categories: z.array(categorySchema).optional(),
});

export type UpdateExtensionPayload = z.infer<typeof updateExtensionSchema>;

export type CategoryInput = z.infer<typeof categorySchema>;
