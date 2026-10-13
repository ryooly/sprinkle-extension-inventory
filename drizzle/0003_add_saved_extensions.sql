CREATE TABLE "saved_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"extension_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_extensions" ADD CONSTRAINT "saved_extensions_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_extensions" ADD CONSTRAINT "saved_extensions_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_extensions_owner_idx" ON "saved_extensions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "saved_extensions_extension_idx" ON "saved_extensions" USING btree ("extension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_extensions_owner_extension_uidx" ON "saved_extensions" USING btree ("owner_id","extension_id");