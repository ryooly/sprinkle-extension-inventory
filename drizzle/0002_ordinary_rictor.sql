CREATE TABLE "daily_showcase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extension_id" uuid NOT NULL,
	"showcase_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_showcase" ADD CONSTRAINT "daily_showcase_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_showcase_date_idx" ON "daily_showcase" USING btree ("showcase_date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_showcase_extension_date_uidx" ON "daily_showcase" USING btree ("extension_id","showcase_date");
