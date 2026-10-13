CREATE TABLE "premium_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extension_id" uuid NOT NULL,
	"premium_date" date NOT NULL,
	"ai_description" text NOT NULL,
	"verified" "verification_status" DEFAULT 'not_verified' NOT NULL,
	"verification_percentage" integer DEFAULT 0,
	"categories" "category"[] DEFAULT '{}' NOT NULL,
	"permissions" "browser_permission"[] DEFAULT '{}' NOT NULL,
	"license_key" text,
	"license_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "premium_extensions" ADD CONSTRAINT "premium_extensions_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "premium_extensions_premium_date_idx" ON "premium_extensions" USING btree ("premium_date");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_extensions_extension_date_uidx" ON "premium_extensions" USING btree ("extension_id","premium_date");