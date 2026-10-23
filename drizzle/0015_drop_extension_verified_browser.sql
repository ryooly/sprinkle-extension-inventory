DROP INDEX "extensions_verified_idx";--> statement-breakpoint
ALTER TABLE "extensions" DROP COLUMN "verified";--> statement-breakpoint
ALTER TABLE "extensions" DROP COLUMN "verification_percentage";--> statement-breakpoint
ALTER TABLE "extensions" DROP COLUMN "browser";