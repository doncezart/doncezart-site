CREATE TABLE "artwork_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"artwork_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"blur_data_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_username" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"payload" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance" (
	"id" text PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"pin_hash" text NOT NULL,
	"initial_amount" integer NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"payment_method" text NOT NULL,
	"label" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "balance_item" (
	"id" text PRIMARY KEY NOT NULL,
	"balance_id" text NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"discount_pct" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_study" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"aspect_ratio" text DEFAULT '1/1' NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name"),
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discovery_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"notes" text,
	"media_type" text NOT NULL,
	"image_url" text,
	"thumbnail_url" text,
	"preview_url" text,
	"youtube_id" text,
	"source_url" text,
	"creator_name" text,
	"creator_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_item_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_item_tag" (
	"item_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_section_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discovery_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "discovery_tag_name_unique" UNIQUE("name"),
	CONSTRAINT "discovery_tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"body" text,
	"price_from" integer,
	"visible" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "slug_redirect" (
	"from_slug" text PRIMARY KEY NOT NULL,
	"to_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "display_mode" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "carousel_direction" text DEFAULT 'horizontal' NOT NULL;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "case_study_id" integer;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "artwork_image" ADD CONSTRAINT "artwork_image_artwork_id_artwork_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artwork"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_item" ADD CONSTRAINT "balance_item_balance_id_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_item" ADD CONSTRAINT "discovery_item_section_id_discovery_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."discovery_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_item_image" ADD CONSTRAINT "discovery_item_image_item_id_discovery_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."discovery_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_item_tag" ADD CONSTRAINT "discovery_item_tag_item_id_discovery_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."discovery_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_item_tag" ADD CONSTRAINT "discovery_item_tag_tag_id_discovery_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."discovery_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_entity_idx" ON "audit_event" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_event_created_idx" ON "audit_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "balance_short_id_idx" ON "balance" USING btree ("short_id");--> statement-breakpoint
CREATE INDEX "balance_item_balance_id_idx" ON "balance_item" USING btree ("balance_id");--> statement-breakpoint
CREATE INDEX "artwork_visible_idx" ON "artwork" USING btree ("visible","deleted_at");--> statement-breakpoint
CREATE INDEX "artwork_category_idx" ON "artwork" USING btree ("category");