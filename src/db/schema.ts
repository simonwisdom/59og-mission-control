import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
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

// The house's shared Gmail account, connected from the dashboard with read-only access. One row at
// most. The refresh token lets the server read the mailbox, so disconnecting deletes the row.
export const houseMailbox = pgTable("house_mailbox", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  refreshToken: text("refresh_token").notNull(),
  // Where the next sync starts: Gmail's history id once the first 30 days are in. While those are
  // still coming in, the page of the message list to fetch next and the history id from before it.
  historyId: text("history_id"),
  backfillPageToken: text("backfill_page_token"),
  backfillHistoryId: text("backfill_history_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  // The login link's name, or null after a password login
  connectedBy: text("connected_by"),
});

// Mail from the house Gmail. Everything here was written by someone outside the house, so it's shown
// as plain text only and handed to Grovelet as quoted data, never as instructions.
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  gmailId: text("gmail_id").notNull().unique(),
  threadId: text("thread_id").notNull(),
  fromName: text("from_name").notNull(),
  fromAddress: text("from_address").notNull(),
  // Everyone it was sent to, as "Name <address>, …"
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  // Plain text: the text part, or the HTML part with its tags taken out
  body: text("body").notNull(),
  attachments: jsonb("attachments").$type<{ filename: string; mimeType: string; size: number }[]>().notNull(),
  // Gmail's labels, e.g. INBOX, UNREAD, SENT
  labels: text("labels").array().notNull(),
  // Deleted in Gmail. The row stays, out of every list.
  deleted: boolean("deleted").default(false).notNull(),
  // The whole message as Gmail gave it (RFC 822), so the fields above can be worked out again later.
  // Null when it's over RAW_LIMIT, which only big attachments reach.
  raw: bytea("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Housemates' trips away, on the calendar beside guests. Every housemate can see and change all of
// them; Grovelet tells anyone in the house who asks.
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  // A first name, as typed, so Grovelet can match it to the housemate it's chatting with
  person: text("person").notNull(),
  // The first day away and the day they're back
  leaveDate: date("leave_date").notNull(),
  backDate: date("back_date").notNull(),
  // Where they're going, if they said
  place: text("place"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  // The login link's name, "Grovelet", or null after a password login
  updatedBy: text("updated_by"),
});

export type Application =typeof applications.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
