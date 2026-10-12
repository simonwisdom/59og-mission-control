import { createHmac } from "node:crypto";
import type { Application } from "@/db/schema";
import { formatPartySize } from "./field-labels";
import { passwordMatches } from "./session";

// Guest stays as a calendar: a month grid on the dashboard, and a feed housemates subscribe to
// from Apple or Google Calendar. Calendar apps can't log in, so the feed URL carries a secret
// derived from SESSION_SECRET; changing SESSION_SECRET changes the link and cuts off old ones.

export type Stay = Pick<Application, "id" | "name" | "partySize" | "arrivalDate" | "departureDate" | "status">;

const DAY_MS = 86_400_000;

export function calendarFeedToken(secret: string) {
  return createHmac("sha256", secret).update("guest-calendar-feed").digest("base64url").slice(0, 32);
}

export function feedTokenMatches(token: string, secret: string) {
  return passwordMatches(token, calendarFeedToken(secret));
}

// "2026-10-12" → "2026-10-13"
export function nextDay(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

// Mondays-first weeks covering the month ("2026-10"), each day as "YYYY-MM-DD", with the
// neighbouring months' days filling the first and last weeks
export function monthWeeks(month: string) {
  const first = Date.parse(`${month}-01T00:00:00Z`);
  const mondayOffset = (new Date(first).getUTCDay() + 6) % 7;
  let day = first - mondayOffset * DAY_MS;
  const weeks: string[][] = [];
  do {
    const week = Array.from({ length: 7 }, (_, i) => new Date(day + i * DAY_MS).toISOString().slice(0, 10));
    weeks.push(week);
    day += 7 * DAY_MS;
  } while (new Date(day).toISOString().slice(0, 7) === month);
  return weeks;
}

// A run of Monday-first weeks starting with the week that holds the day ("2026-10-12")
export function weeksFrom(date: string, count: number) {
  const day = Date.parse(`${date}T00:00:00Z`);
  const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
  return Array.from({ length: count }, (_, week) =>
    Array.from({ length: 7 }, (_, i) => new Date(monday + (week * 7 + i) * DAY_MS).toISOString().slice(0, 10)),
  );
}

// "2026-10" plus or minus a number of months
export function shiftMonth(month: string, by: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

export const isMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

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
