import {
  pgTable,
  serial,
  uuid,
  integer,
  varchar,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { accounts } from "@/modules/auth/db/schema";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "expired",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
]);

export const planNameEnums = pgEnum("plan_name", ["basic", "pro", "premium"]);

export const durationEnums = pgEnum("duration_enums", ["basic", "pro", "premium"]); 

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: planNameEnums("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  durationInDays:  durationEnums("duration_in_days").notNull(),
  isActive: integer("is_active").notNull().default(1), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => accounts.id),
  planId: integer("plan_id")
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  transactionId: varchar("transaction_id", { length: 255 }).notNull().unique(), 
  paymentMethod: varchar("payment_method", { length: 50 }), 
  snapToken: varchar("snap_token", { length: 255 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
