import { z } from "zod";
import type { HouseEvent } from "@/db/schema";

// Events the house might want to know about. The dashboard and Grovelet both send events through
// parseEvent, so the same rules hold however an event comes in.

export type EventFields = Pick<HouseEvent, "addedBy" | "title" | "date" | "endDate" | "time" | "place" | "link">;

// An event running longer than this is almost always a typo in the date
export const MAX_EVENT_DAYS = 31;

// A blank box becomes null
const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => value || null);

const eventSchema = z
  .object({
    addedBy: z.string("Say who's adding it").trim().min(1, "Say who's adding it").max(40, "Use a first name"),
    title: z.string("Say what's on").trim().min(1, "Say what's on").max(100, "Keep it under 100 characters"),
    date: z.iso.date("Choose the day it's on"),
    endDate: z
      .union([z.iso.date("Choose the last day, or leave it blank"), z.literal("")])
      .optional()
      .nullable()
      .transform((value) => value || null),
    time: optional(30, "Keep the time under 30 characters"),
    place: optional(100, "Keep where under 100 characters"),
    link: optional(500, "That link is too long").refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), {
      message: "Use a web link starting with https://",
    }),
  })
  .refine((event) => !event.endDate || event.endDate >= event.date, { path: ["endDate"], message: "The last day must be on or after the first" })
  .refine((event) => !event.endDate || daysBetween(event.date, event.endDate) <= MAX_EVENT_DAYS, {
    path: ["endDate"],
    message: "That's over a month; check the dates",
  })
  // A one-day event keeps no end date, so the same event is stored one way
  .transform((event) => ({ ...event, endDate: event.endDate === event.date ? null : event.endDate }));

export type EventErrors = Partial<Record<keyof EventFields, string>>;

export function parseEvent(input: Record<string, unknown>): { success: true; data: EventFields } | { success: false; errors: EventErrors } {
  const result = eventSchema.safeParse({
    addedBy: input.addedBy ?? undefined,
    title: input.title ?? undefined,
    date: input.date ?? undefined,
    endDate: input.endDate ?? undefined,
    time: input.time ?? undefined,
    place: input.place ?? undefined,
    link: input.link ?? undefined,
  });
  if (result.success) return { success: true, data: result.data };
  const errors: EventErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof EventFields] ??= issue.message;
  return { success: false, errors };
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

// The last day it's on
export const eventEnd = (event: Pick<HouseEvent, "date" | "endDate">) => event.endDate ?? event.date;

// "Jazz night · 8pm · Cafe Oto"
export function eventLabel(event: Pick<HouseEvent, "title" | "time" | "place">) {
  return [event.title, event.time, event.place].filter(Boolean).join(" · ");
}
