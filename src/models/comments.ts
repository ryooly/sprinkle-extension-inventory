import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { accounts } from "./accounts";
import { extensions } from "./extensions";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    content: text("content").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    authorIdx: index("comments_author_idx").on(table.authorId),
    extensionIdx: index("comments_extension_idx").on(table.extensionId),
    createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
  }),
);

export const subComments = pgTable(
  "sub_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    extensionId: uuid("extension_id")
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),

    content: text("content").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    commentIdx: index("sub_comments_comment_idx").on(table.commentId),
    authorIdx: index("sub_comments_author_idx").on(table.authorId),
    extensionIdx: index("sub_comments_extension_idx").on(table.extensionId),
    createdAtIdx: index("sub_comments_created_at_idx").on(table.createdAt),
  }),
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(accounts, {
    fields: [comments.authorId],
    references: [accounts.id],
  }),
  extension: one(extensions, {
    fields: [comments.extensionId],
    references: [extensions.id],
  }),
  subComments: many(subComments),
}));

export const subCommentsRelations = relations(subComments, ({ one }) => ({
  comment: one(comments, {
    fields: [subComments.commentId],
    references: [comments.id],
  }),
  author: one(accounts, {
    fields: [subComments.authorId],
    references: [accounts.id],
  }),
  extension: one(extensions, {
    fields: [subComments.extensionId],
    references: [extensions.id],
  }),
}));

export const accountsCommentsRelations = relations(accounts, ({ many }) => ({
  comments: many(comments),
}));

export const extensionsCommentsRelations = relations(
  extensions,
  ({ many }) => ({
    comments: many(comments),
  }),
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type SubComment = typeof subComments.$inferSelect;
export type NewSubComment = typeof subComments.$inferInsert;
