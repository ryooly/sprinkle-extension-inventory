ALTER TABLE "extensions" ADD COLUMN "license_name" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "license_key" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "license_description" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "license_permissions" text[];--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "license_conditions" text[];--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "license_limitations" text[];