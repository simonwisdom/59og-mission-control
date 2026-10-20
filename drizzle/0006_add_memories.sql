CREATE TABLE "memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"chain_id" integer,
	"replaced_at" timestamp with time zone,
	"replaced_by" text,
	"removed_at" timestamp with time zone,
	"removed_by" text
);
