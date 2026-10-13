CREATE TABLE "page_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "page_images" ADD CONSTRAINT "page_images_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "pages" ("slug", "title", "body") VALUES ('room', 'A room in our house', $body$Space for the listing introduction.

| | |
|---|---|
| **Monthly rent** | To be added |
| **Available from** | To be added |
| **Area and transport** | Finsbury Park |

## The room and the house

Describe the room and the house here.

## Who you'd live with

Introduce the household here.

## Day-to-day life

House habits and practical details go here.

## The practical details

Bills, deposit, furnishings, length of stay and how viewings work.

## Interested?

Tell us a bit about you and when you'd like to move: how to get in touch goes here.
$body$);
