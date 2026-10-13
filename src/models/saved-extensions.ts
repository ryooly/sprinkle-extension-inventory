import {
  pgTable,
  uuid,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { extensions } from "./extensions";

export const savedExtensions = pgTable(
  "saved_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ownerIdx: index("saved_extensions_owner_idx").on(table.ownerId),
    extensionIdx: index("saved_extensions_extension_idx").on(table.extensionId),

    uniqueSavePerOwner: uniqueIndex("saved_extensions_owner_extension_uidx").on(
      table.ownerId,
      table.extensionId,
    ),
  }),
);

export type SavedExtension = typeof savedExtensions.$inferSelect;
export type NewSavedExtension = typeof savedExtensions.$inferInsert;
