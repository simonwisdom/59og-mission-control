CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"from_name" text NOT NULL,
	"from_address" text NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb NOT NULL,
	"labels" text[] NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"raw" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_gmail_id_unique" UNIQUE("gmail_id")
);
--> statement-breakpoint
CREATE TABLE "house_mailbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"refresh_token" text NOT NULL,
	"history_id" text,
	"backfill_page_token" text,
	"backfill_history_id" text,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_by" text
);
