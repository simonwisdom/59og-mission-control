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
  phone: text("phone"),
  pronouns: text("pronouns"),

  arrivalDate: date("arrival_date").notNull(),
  departureDate: date("departure_date").notNull(),
  partySize: integer("party_size").notNull(),

  about: text("about").notNull(),
  reason: text("reason").notNull(),
  connection: text("connection"),

  dietaryNeeds: text("dietary_needs"),
  allergies: text("allergies"),
  pets: text("pets"),
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
