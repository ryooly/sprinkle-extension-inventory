ALTER TABLE "extensions" ADD COLUMN "endpoint_safety" jsonb;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "security_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "security_risks" text[];--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "repo_grade" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "repo_rating" jsonb;