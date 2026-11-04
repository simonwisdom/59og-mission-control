CREATE TABLE "housemates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rent" integer NOT NULL,
	"bills" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "payment_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"housemate_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text
);
--> statement-breakpoint
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_housemate_id_housemates_id_fk" FOREIGN KEY ("housemate_id") REFERENCES "public"."housemates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The house as of November 2026, and the references each housemate's payments carry, so House money
-- matches from the start. Changed on House money after this.
INSERT INTO "housemates" ("name", "rent", "bills") VALUES
	('Simon & Paulina', 144286, 36200),
	('Bryan', 80618, 18100),
	('Rita', 80618, 18100),
	('Adam', 99739, 18100),
	('Alex', 99739, 18100);--> statement-breakpoint
INSERT INTO "payment_rules" ("reference", "housemate_id")
SELECT rule.reference, "housemates"."id"
FROM (VALUES
	('rent', 'Simon & Paulina'),
	('bills', 'Simon & Paulina'),
	('rent', 'Bryan'),
	('bills', 'Bryan'),
	('rita rent', 'Rita'),
	('rita bills', 'Rita'),
	('rent adam spooner', 'Adam'),
	('og bills', 'Adam'),
	('og', 'Adam'),
	('59og joint acct', 'Alex'),
	('alex bills', 'Alex')
) AS rule(reference, name)
JOIN "housemates" ON "housemates"."name" = rule.name;--> statement-breakpoint
INSERT INTO "payment_rules" ("reference", "housemate_id") VALUES
	('community fund', NULL),
	('21day accomodation', NULL);