CREATE TYPE "public"."browser" AS ENUM('chrome', 'opera', 'edge');--> statement-breakpoint
CREATE TYPE "public"."browser_permission" AS ENUM('readBrowsingHistory', 'readOpenTabs', 'readWebsiteData', 'readCookies', 'manageDownloads', 'manageBookmarks', 'clipboardRead', 'clipboardWrite', 'showNotifications', 'accessAllWebsites', 'accessCurrentWebsite', 'backgroundExecution');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('productivity', 'developer_tools', 'communication', 'design', 'finance', 'security', 'education', 'entertainment', 'social', 'utilities', 'general', 'misc', 'other');--> statement-breakpoint
CREATE TYPE "public"."extension_status" AS ENUM('premium', 'basic');--> statement-breakpoint
CREATE TYPE "public"."publisher_type" AS ENUM('automation', 'user');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('github', 'gitlab', 'bitbucket', 'other');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'not_verified');--> statement-breakpoint
CREATE TYPE "public"."duration_enums" AS ENUM('basic', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."plan_name" AS ENUM('basic', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "extension_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extension_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_permissions" (
	"extension_id" uuid NOT NULL,
	"permission" "browser_permission" NOT NULL,
	CONSTRAINT "extension_permissions_extension_id_permission_pk" PRIMARY KEY("extension_id","permission")
);
--> statement-breakpoint
CREATE TABLE "extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_by" "publisher_type" DEFAULT 'automation' NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"developer" text NOT NULL,
	"verified" "verification_status" DEFAULT 'not_verified' NOT NULL,
	"verification_percentage" integer DEFAULT 0,
	"source" "source" DEFAULT 'github' NOT NULL,
	"extension_link" text NOT NULL,
	"browser" "browser" DEFAULT 'chrome' NOT NULL,
	"extension_status" "extension_status" DEFAULT 'basic' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"amount_displayed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fetched_repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_name" text NOT NULL,
	CONSTRAINT "fetched_repos_repo_name_unique" UNIQUE("repo_name")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"transaction_id" varchar(255) NOT NULL,
	"payment_method" varchar(50),
	"snap_token" varchar(255),
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" "plan_name" NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"duration_in_days" "duration_enums" NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extension_categories" ADD CONSTRAINT "extension_categories_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_permissions" ADD CONSTRAINT "extension_permissions_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extension_categories_category_idx" ON "extension_categories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "extension_categories_extension_id_idx" ON "extension_categories" USING btree ("extension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "extension_categories_extension_category_uidx" ON "extension_categories" USING btree ("extension_id","category");--> statement-breakpoint
CREATE INDEX "extensions_developer_idx" ON "extensions" USING btree ("developer");--> statement-breakpoint
CREATE INDEX "extensions_verified_idx" ON "extensions" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "extensions_source_idx" ON "extensions" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "extensions_name_developer_uidx" ON "extensions" USING btree ("name","developer");