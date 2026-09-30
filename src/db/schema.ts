import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const applicationStatus = pgEnum("application_status", [
  "pending",
  "approved",
  "declined",
]);

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  status: applicationStatus("status").default("pending").notNull(),

  name: text("name").notNull(),
  email: text("email").notNull(),

  arrivalDate: date("arrival_date").notNull(),
  departureDate: date("departure_date").notNull(),
  partySize: integer("party_size").notNull(),

  about: text("about").notNull(),
  connection: text("connection"),
  // What they'd like to contribute while staying, e.g. cooking a dinner. Nullable
  // because applications from before this question was asked don't have it.
  offering: text("offering"),
  // Dietary needs, allergies, pets, accessibility, etc.
  anythingElse: text("anything_else"),
  agreedToRules: boolean("agreed_to_rules").notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
