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
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export interface SecurityBreakdown {
  endpointThreats: number;
  verificationConfidence: number;
  transportHygiene: number;
  permissionExposure: number;
}

export interface RepoRatingBreakdown {
  stars: number;
  forks: number;
  lastUpdate: number;
  closedIssueRatio: number;
  securityAlerts: number;
}

export interface RepoRating {
  totalScore: number;
  breakdown: RepoRatingBreakdown;
}

export type RepoGrade = "S" | "A" | "B" | "C" | "D" | "E";

export interface EndpointThreat {
  threatType: string;
  platformType: string;
  threatEntryType: string;
}

export interface EndpointSafety {
  type: "internal" | "external";
  file: string;
  method: string;
  path: string;
  safe: boolean;
  threats: EndpointThreat[];
  checkedAt: string;
  skippedOnError: boolean;
}

export type SecurityRisk =
  | "flagged-endpoint"
  | "unverified-endpoint"
  | "insecure-endpoint"
  | "sensitive-permission";

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
  "firefox",
  "safari",
]);

export const extensionStatusEnum = pgEnum("extension_status", [
  "premium",
  "basic",
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
    source: sourceEnum("source").notNull().default("github"),
    extensionLink: text("extension_link").notNull(),
    supportedBrowsers: browserEnum("supported_browsers").array(),
    frontendLanguages: text("frontend_languages").array(),
    backendLanguages: text("backend_languages").array(),
    lastCommitDate: timestamp("last_commit_date", { withTimezone: true }),
    stars: integer("stars"),
    repoFiles: text("repo_files").array(),
    apiEndpoints: text("api_endpoints").array(),
    endpointSafety: jsonb("endpoint_safety").$type<EndpointSafety[]>(),
    securityScore: integer("security_score"),
    securityBreakdown: jsonb("security_breakdown").$type<SecurityBreakdown>(),
    securityRisks: text("security_risks").array().$type<SecurityRisk[]>(),
    announcement: text("announcement"),
    repoGrade: text("repo_grade").$type<RepoGrade>(),
    repoRating: jsonb("repo_rating").$type<RepoRating>(),
    extensionStatus: extensionStatusEnum("extension_status")
      .notNull()
      .default("basic"),

    licenseName: text("license_name"),
    licenseKey: text("license_key"),
    licenseDescription: text("license_description"),
    licensePermissions: text("license_permissions").array(),
    licenseConditions: text("license_conditions").array(),
    licenseLimitations: text("license_limitations").array(),
    licenseUrl: text("license_url"),

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

export const hashtags = pgTable(
  "hashtags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueName: uniqueIndex("hashtags_name_uidx").on(table.name),
  }),
);

export const extensionHashtags = pgTable(
  "extension_hashtags",
  {
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    hashtagId: uuid("hashtag_id")
      .notNull()
      .references(() => hashtags.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.extensionId, table.hashtagId] }),
    hashtagIdIdx: index("extension_hashtags_hashtag_id_idx").on(
      table.hashtagId,
    ),
    extensionIdIdx: index("extension_hashtags_extension_id_idx").on(
      table.extensionId,
    ),
  }),
);

export const fetchedRepos = pgTable("fetched_repos", {
  id: serial("id").primaryKey(),
  repoName: text("repo_name").notNull().unique(),
});

export const extensionsRelations = relations(extensions, ({ many }) => ({
  categories: many(extensionCategories),
  hashtags: many(extensionHashtags),
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

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  extensions: many(extensionHashtags),
}));

export const extensionHashtagsRelations = relations(
  extensionHashtags,
  ({ one }) => ({
    extension: one(extensions, {
      fields: [extensionHashtags.extensionId],
      references: [extensions.id],
    }),
    hashtag: one(hashtags, {
      fields: [extensionHashtags.hashtagId],
      references: [hashtags.id],
    }),
  }),
);

export type Extension = typeof extensions.$inferSelect;
export type NewExtension = typeof extensions.$inferInsert;

export type ExtensionCategory = typeof extensionCategories.$inferSelect;
export type NewExtensionCategory = typeof extensionCategories.$inferInsert;

export type Hashtag = typeof hashtags.$inferSelect;
export type NewHashtag = typeof hashtags.$inferInsert;

export type ExtensionHashtag = typeof extensionHashtags.$inferSelect;
export type NewExtensionHashtag = typeof extensionHashtags.$inferInsert;

export type VerificationStatus =
  (typeof verificationStatusEnum.enumValues)[number];
export type Source = (typeof sourceEnum.enumValues)[number];
export type Category = (typeof categoryEnum.enumValues)[number];
export type Browser = (typeof browserEnum.enumValues)[number];
export type BrowserPermission =
  (typeof browserPermissionEnum.enumValues)[number];
export type ExtensionStatus = (typeof extensionStatusEnum.enumValues)[number];
export type PublisherType = (typeof publisherTypeEnum.enumValues)[number];
