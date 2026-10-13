import { createHmac } from "node:crypto";
import type { Application } from "@/db/schema";
import { formatPartySize } from "./field-labels";
import { nextDay } from "./dates";
import { passwordMatches } from "./session";

export { isMonth, monthWeeks, nextDay, shiftMonth, weeksFrom } from "./dates";

// Guest stays as a calendar: a month grid on the dashboard, and a feed housemates subscribe to
// from Apple or Google Calendar. Calendar apps can't log in, so the feed URL carries a secret
// derived from SESSION_SECRET; changing SESSION_SECRET changes the link and cuts off old ones.

export type Stay = Pick<Application, "id" | "name" | "partySize" | "arrivalDate" | "departureDate" | "status">;

export function calendarFeedToken(secret: string) {
  return createHmac("sha256", secret).update("guest-calendar-feed").digest("base64url").slice(0, 32);
}

export function feedTokenMatches(token: string, secret: string) {
  return passwordMatches(token, calendarFeedToken(secret));
}

export function stayTitle(stay: Stay) {
  const name = stay.partySize > 1 ? `${stay.name} (${formatPartySize(stay.partySize)})` : stay.name;
  return stay.status === "approved" ? name : `Requested: ${name}`;
}

// iCalendar text values escape backslashes, semicolons, commas and newlines
const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes continue on the next line after a space
function fold(line: string) {
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char) > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (date: string) => date.replaceAll("-", "");

// An all-day event from arrival through the departure day, so the day they leave shows too.
// Only confirmed and requested stays belong in the feed; declined ones are left out by the caller.
export function guestFeed(stays: Stay[], { appUrl, now = new Date() }: { appUrl?: string; now?: Date }) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const base = appUrl?.replace(/\/$/, "");
  const events = stays.flatMap((stay) => [
    "BEGIN:VEVENT",
    `UID:guest-stay-${stay.id}@olive-grove`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(stay.arrivalDate)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(stay.departureDate))}`,
    `SUMMARY:${escapeText(stayTitle(stay))}`,
    `STATUS:${stay.status === "approved" ? "CONFIRMED" : "TENTATIVE"}`,
    "TRANSP:TRANSPARENT",
    ...(base ? [`URL:${base}/dashboard/applications/${stay.id}`] : []),
    "END:VEVENT",
  ]);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Olive Grove//Mission Control//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Olive Grove guests",
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events,
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// The nights a stay takes up, as "YYYY-MM-DD" for each night's evening: arrival up to the night
// before departure, so a new guest can arrive on the day another leaves. A same-day visit
// still takes up its one day.
export function stayNights({ arrivalDate, departureDate }: Pick<Stay, "arrivalDate" | "departureDate">) {
  const nights = [arrivalDate];
  for (let night = nextDay(arrivalDate); night < departureDate; night = nextDay(night)) nights.push(night);
  return nights;
}

// Every night taken by a confirmed stay, sorted, without names, so the apply page can grey them out
export function bookedNights(stays: Pick<Stay, "arrivalDate" | "departureDate">[]) {
  return [...new Set(stays.flatMap(stayNights))].sort();
}

export function overlapsBooked(stay: Pick<Stay, "arrivalDate" | "departureDate">, booked: Iterable<string>) {
  const taken = new Set(booked);
  return stayNights(stay).some((night) => taken.has(night));
}
