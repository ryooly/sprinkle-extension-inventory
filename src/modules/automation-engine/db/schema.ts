import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const verificationStatusEnum = pgEnum("verification_status", [
  "verified",
  "not_verified",
]);

export const sourceEnum = pgEnum("source", [
  "github",
  "gitlab",
  "bitbucket",
  "other",
]);

export const publisherTypeEnum = pgEnum("publisher_type", [
  "automation",
  "user",
]);

export const browserEnum = pgEnum("browser", [
  "chrome",
  "opera",
  "edge",
]);

export const extensions = pgTable(
  "extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publishedBy: publisherTypeEnum("published_by")
      .notNull()
      .default("automation"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    developer: text("developer").notNull(),
    verified: verificationStatusEnum("verified")
      .notNull()
      .default("not_verified"),
    verificationPercentage: integer("verification_percentage").default(0),
    source: sourceEnum("source").notNull().default("github"),
    extensionLink: text("extension_link").notNull(),
    browser: browserEnum("browser").notNull().default("chrome"),

    views: integer("views").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    amountDisplayed: integer("amount_displayed").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    developerIdx: index("extensions_developer_idx").on(table.developer),
    verifiedIdx: index("extensions_verified_idx").on(table.verified),
    sourceIdx: index("extensions_source_idx").on(table.source),
    uniqueNamePerDeveloper: uniqueIndex("extensions_name_developer_uidx").on(
      table.name,
      table.developer,
    ),
  }),
);



export const browserPermissionEnum = pgEnum("browser_permission", [
  "readBrowsingHistory",
  "readOpenTabs",
  "readWebsiteData",
  "readCookies",
  "manageDownloads",
  "manageBookmarks",
  "clipboardRead",
  "clipboardWrite",
  "showNotifications",
  "accessAllWebsites",
  "accessCurrentWebsite",
  "backgroundExecution",
]);

export const extensionPermissions = pgTable(
  "extension_permissions",
  {
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    permission: browserPermissionEnum("permission").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.extensionId, table.permission],
    }),
  }),
);



export const categoryEnum = pgEnum("category", [
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

export const extensionCategories = pgTable(
  "extension_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    category: categoryEnum("category").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    categoryIdx: index("extension_categories_category_idx").on(table.category),
    extensionIdIdx: index("extension_categories_extension_id_idx").on(
      table.extensionId,
    ),
    uniqueExtensionCategory: uniqueIndex(
      "extension_categories_extension_category_uidx",
    ).on(table.extensionId, table.category),
  }),
);

export const fetchedRepos = pgTable("fetched_repos", {
  id: serial("id").primaryKey(),
  repoName: text("repo_name").notNull().unique(),
});

export const extensionsRelations = relations(extensions, ({ many }) => ({
  categories: many(extensionCategories),
}));

export const extensionCategoriesRelations = relations(
  extensionCategories,
  ({ one }) => ({
    extension: one(extensions, {
      fields: [extensionCategories.extensionId],
      references: [extensions.id],
    }),
  }),
);

export type Extension = typeof extensions.$inferSelect;
export type NewExtension = typeof extensions.$inferInsert;

export type ExtensionCategory = typeof extensionCategories.$inferSelect;
export type NewExtensionCategory = typeof extensionCategories.$inferInsert;

export type VerificationStatus =
  (typeof verificationStatusEnum.enumValues)[number];
export type Source = (typeof sourceEnum.enumValues)[number];
export type Category = (typeof categoryEnum.enumValues)[number];
export type Browser = (typeof browserEnum.enumValues)[number];

/// belum begit ppaham tentang relations dan tabel tabelan terus ini yang paling bawah
