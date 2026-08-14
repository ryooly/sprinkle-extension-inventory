import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const roleEnum = pgEnum("role", ["users", "builder"]);

export const verifiedStatusEnum = pgEnum("verified_status", [
  "verified",
  "not_verified",
]);

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  role: roleEnum("role").default("users").notNull(), 
  isVerified: verifiedStatusEnum("is_verified").default("not_verified"), 
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const saved = pgTable("saved", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  totalExtension: integer("total_extension").default(0).notNull(),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  saved: one(saved, {
    fields: [accounts.id],
    references: [saved.ownerId],
  }),
  inventory: one(inventory, {
    fields: [accounts.id],
    references: [inventory.ownerId],
  }),
}));

export const savedRelations = relations(saved, ({ one }) => ({
  owner: one(accounts, {
    fields: [saved.ownerId],
    references: [accounts.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  owner: one(accounts, {
    fields: [inventory.ownerId],
    references: [accounts.id],
  }),
}));

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Saved = InferSelectModel<typeof saved>;
export type NewSaved = InferInsertModel<typeof saved>;

export type Inventory = InferSelectModel<typeof inventory>;
export type NewInventory = InferInsertModel<typeof inventory>;


export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RefreshToken = InferSelectModel<typeof refreshTokens>;
export type NewRefreshToken = InferInsertModel<typeof refreshTokens>;

