import {
  pgTable,
  uuid,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { extensions } from "../../automation-engine/db/schema";

/**
 * Daily showcase – the set of extensions surfaced to the frontend for a given
 * day. The 24-hour automation's `runDailyJob` writes the extensions it
 * retrieved here; the frontend reads them back through the `/showcase` route.
 *
 * This lives in its own module, deliberately separate from the generator:
 * the automation stays a dumb global producer, while this table is the
 * delivery-facing "what is on display" record.
 */
export const dailyShowcase = pgTable(
  "daily_showcase",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    // Calendar day (YYYY-MM-DD) the extension was showcased on.
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
