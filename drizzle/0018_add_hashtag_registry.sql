CREATE TABLE "extension_hashtags" (
	"extension_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extension_hashtags_extension_id_hashtag_id_pk" PRIMARY KEY("extension_id","hashtag_id")
);
--> statement-breakpoint
CREATE TABLE "hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extension_hashtags" ADD CONSTRAINT "extension_hashtags_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_hashtags" ADD CONSTRAINT "extension_hashtags_hashtag_id_hashtags_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extension_hashtags_hashtag_id_idx" ON "extension_hashtags" USING btree ("hashtag_id");--> statement-breakpoint
CREATE INDEX "extension_hashtags_extension_id_idx" ON "extension_hashtags" USING btree ("extension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hashtags_name_uidx" ON "hashtags" USING btree ("name");