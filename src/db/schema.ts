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

// Personal login links, one per housemate's set of devices. Only a hash of each link's key is
// stored. Deleting a row turns the link off and logs out every device that used it.
export const loginLinks = pgTable("login_links", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  // Updated when the link is opened and when its session is renewed, at most daily
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export type Application =typeof applications.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
