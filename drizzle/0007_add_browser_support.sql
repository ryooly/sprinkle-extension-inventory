ALTER TYPE "public"."browser" ADD VALUE 'firefox';--> statement-breakpoint
ALTER TYPE "public"."browser" ADD VALUE 'safari';--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "supported_browsers" "browser"[];