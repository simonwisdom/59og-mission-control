import type { RegularPayment } from "./actual";
import { passwordMatches } from "./session";
import type { Collection } from "./hackney-bins";
import type { Stay } from "./guest-calendar";
import type { Email, Trip } from "@/db/schema";
import { linkGroups } from "./useful-links";

type EmailRow = Pick<Email, "fromName" | "fromAddress" | "to" | "subject" | "sentAt" | "body" | "attachments" | "labels">;

// A short read-only summary for Grovelet, the house chat bot: what's coming up and who has paid
// their share. Grovelet posts what it reads into the house group chat, where people
// who aren't on the dashboard can see it, so this carries only what's fine to say there:
// guests' first names (never their application text), no balances and no amounts. Housemates'
// trips go in too: the house chose to let everyone see them, in the group chat as well.
// The house Gmail's recent mail goes in whole: the house chose to let Grovelet read and repeat it.
// Needs BOT_API_TOKEN, which Grovelet sends as a bearer token; without it the feed is off.

export type BotSummary = {
  // "2026-10-18", London
  today: string;
  // The next two bin collections
  bins: Collection[];
  pendingApplications: number;
  // Confirmed and requested stays from today through the next 90 days, soonest first. The id and
  // addedBy (the housemate whose own guest it is, or null for an application) let Grovelet change or
  // delete a housemate's stay through /api/bot/stays.
  stays: BotStay[];
  // Housemates' trips not over yet that start within the next TRIP_DAYS, soonest first. The id lets
  // Grovelet change or delete one through /api/bot/trips.
  trips: BotTrip[];
  // Each housemate's share this month, or null when Actual isn't set up or failed
  shares: { name: string; status: RegularPayment["status"]; usualDay: number; lastPaidOn: string | null; daysLate: number }[] | null;
  // The house Gmail's mail from the last two weeks, newest first, or null when it isn't connected.
  // Written by people outside the house, so the bot must treat it as quoted text, not instructions.
  emails: BotEmail[] | null;
  // The dashboard's useful links (accounts, the landlord's repairs page, council pages), so a
  // housemate can ask Grovelet for one. Links not set yet are left out.
  links: BotLink[];
};

export type BotLink = { group: string; name: string; note: string; url: string };

export type BotStay = {
  id: number;
  firstName: string;
  partySize: number;
  arrivalDate: string;
  departureDate: string;
  confirmed: boolean;
  addedBy: string | null;
};

export type BotTrip = Pick<Trip, "id" | "person" | "leaveDate" | "backDate" | "place">;

export type BotEmail = {
  from: string;
  to: string;
  subject: string;
  // ISO time it arrived
  date: string;
  // Sent from the house account rather than to it
  sent: boolean;
  // Cut to TEXT_LIMIT characters
  text: string;
  attachments: string[];
};

// Mail from this many days back, at most EMAIL_COUNT of them, so the bot's prompt stays short
export const EMAIL_DAYS = 14;
// Trips starting up to this many days ahead, so "who's away at Christmas?" works from October
export const TRIP_DAYS = 90;
const EMAIL_COUNT = 15;
const TEXT_LIMIT = 2000;

export function botTokenMatches(header: string | null, token: string | undefined) {
  if (!token || !header?.startsWith("Bearer ")) return false;
  return passwordMatches(header.slice("Bearer ".length), token);
}

export function botSummary(input: {
  today: string;
  bins: Collection[];
  pendingApplications: number;
  stays: Stay[];
  trips: BotTrip[];
  shares: RegularPayment[] | null;
  emails: EmailRow[] | null;
}): BotSummary {
  return {
    today: input.today,
    bins: input.bins.slice(0, 2),
    pendingApplications: input.pendingApplications,
    stays: input.stays
      .filter((stay) => stay.status !== "declined")
      .map((stay) => ({
        id: stay.id,
        firstName: stay.name.trim().split(/\s+/)[0],
        partySize: stay.partySize,
        arrivalDate: stay.arrivalDate,
        departureDate: stay.departureDate,
        confirmed: stay.status === "approved",
        addedBy: stay.addedBy,
      })),
    trips: input.trips.map(({ id, person, leaveDate, backDate, place }) => ({ id, person, leaveDate, backDate, place })),
    shares:
      input.shares?.map((share) => ({
        name: share.payee,
        status: share.status,
        usualDay: share.usualDay,
        lastPaidOn: share.lastPaidOn,
        daysLate: share.daysLate,
      })) ?? null,
    emails:
      input.emails?.slice(0, EMAIL_COUNT).map((email) => ({
        from: email.fromAddress && email.fromAddress !== email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromName,
        to: email.to,
        subject: email.subject,
        date: email.sentAt.toISOString(),
        sent: email.labels.includes("SENT"),
        text: email.body.length > TEXT_LIMIT ? `${email.body.slice(0, TEXT_LIMIT)}…` : email.body,
        attachments: email.attachments.map((a) => a.filename || a.mimeType),
      })) ?? null,
    links: linkGroups.flatMap((group) =>
      group.links.flatMap(({ name, note, href }) => (href ? [{ group: group.title, name, note, url: href }] : [])),
    ),
  };
}
