CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"event_date" date NOT NULL,
	"end_date" date,
	"location" text NOT NULL,
	"category" text NOT NULL,
	"result_position" text,
	"cover_image_url" text,
	"cover_image_alt" text,
	"body_html" text,
	"body_json" jsonb,
	"upcoming" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"cover_image_url" text,
	"cover_image_alt" text,
	"body_html" text,
	"body_json" jsonb,
	"tags" text[],
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"broadcast_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_overrides" (
	"coachaible_id" text PRIMARY KEY NOT NULL,
	"position" text,
	"total_competitors" integer,
	"fleet" text,
	"external_url" text,
	"notes" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_review_decisions" (
	"event_id" text PRIMARY KEY NOT NULL,
	"decision" text NOT NULL,
	"overrides" jsonb,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");