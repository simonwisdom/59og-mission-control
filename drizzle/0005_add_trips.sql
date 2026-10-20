CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"person" text NOT NULL,
	"leave_date" date NOT NULL,
	"back_date" date NOT NULL,
	"place" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
