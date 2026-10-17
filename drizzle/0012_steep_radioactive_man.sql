CREATE TABLE "sub_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"extension_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sub_comments" ADD CONSTRAINT "sub_comments_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_comments" ADD CONSTRAINT "sub_comments_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_comments" ADD CONSTRAINT "sub_comments_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sub_comments_comment_idx" ON "sub_comments" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "sub_comments_author_idx" ON "sub_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sub_comments_extension_idx" ON "sub_comments" USING btree ("extension_id");--> statement-breakpoint
CREATE INDEX "sub_comments_created_at_idx" ON "sub_comments" USING btree ("created_at");