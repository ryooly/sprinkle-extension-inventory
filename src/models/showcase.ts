import {
  pgTable,
  uuid,
  date,
  timestamp,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  extensions,
  verificationStatusEnum,
  categoryEnum,
  browserPermissionEnum,
} from "./extensions";

export const dailyShowcase = pgTable(
  "daily_showcase",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    showcaseDate: date("showcase_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dateIdx: index("daily_showcase_date_idx").on(table.showcaseDate),
    uniqueExtensionPerDay: uniqueIndex("daily_showcase_extension_date_uidx").on(
      table.extensionId,
      table.showcaseDate,
    ),
  }),
);

export const dailyShowcaseRelations = relations(dailyShowcase, ({ one }) => ({
  extension: one(extensions, {
    fields: [dailyShowcase.extensionId],
    references: [extensions.id],
  }),
}));

export type DailyShowcase = typeof dailyShowcase.$inferSelect;
export type NewDailyShowcase = typeof dailyShowcase.$inferInsert;

export const premiumExtensions = pgTable(
  "premium_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    premiumDate: date("premium_date", { mode: "string" }).notNull(),

    aiDescription: text("ai_description").notNull(),
    verified: verificationStatusEnum("verified")
      .notNull()
      .default("not_verified"),
    verificationPercentage: integer("verification_percentage").default(0),
    categories: categoryEnum("categories")
      .array()
      .notNull()
      .default([]),
    permissions: browserPermissionEnum("permissions")
      .array()
      .notNull()
      .default([]),
    licenseKey: text("license_key"),
    licenseName: text("license_name"),
    licenseUrl: text("license_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dateIdx: index("premium_extensions_premium_date_idx").on(table.premiumDate),
    uniqueExtensionPerDay: uniqueIndex(
      "premium_extensions_extension_date_uidx",
    ).on(table.extensionId, table.premiumDate),
  }),
);

export const premiumExtensionsRelations = relations(
  premiumExtensions,
  ({ one }) => ({
    extension: one(extensions, {
      fields: [premiumExtensions.extensionId],
      references: [extensions.id],
    }),
  }),
);

export type PremiumExtension = typeof premiumExtensions.$inferSelect;
export type NewPremiumExtension = typeof premiumExtensions.$inferInsert;
