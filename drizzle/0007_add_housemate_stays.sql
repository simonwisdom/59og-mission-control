ALTER TABLE "applications" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "about" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "added_by" text;