CREATE TYPE "public"."application_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"pronouns" text,
	"arrival_date" date NOT NULL,
	"departure_date" date NOT NULL,
	"party_size" integer NOT NULL,
	"about" text NOT NULL,
	"reason" text NOT NULL,
	"connection" text,
	"dietary_needs" text,
	"allergies" text,
	"pets" text,
	"agreed_to_rules" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;