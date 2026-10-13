import {
  boolean,
  customType,
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

// Pages housemates write in the dashboard, e.g. the room listing. A published page can be read
// by anyone with its link at /p/<slug>; a draft only by housemates.
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Markdown
  body: text("body").default("").notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  // The login link's name, or null after a password login, which doesn't say who it was
  updatedBy: text("updated_by"),
});

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// Photos added to a page, kept in the database so there's no separate file store to run.
// The editor shrinks them in the browser before upload.
export const pageImages = pgTable("page_images", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Application =typeof applications.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
