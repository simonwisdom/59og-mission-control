import { z } from "zod";
import type { Trip } from "@/db/schema";

// Housemates' trips away. The dashboard and Grovelet both send trips through parseTrip, so the
// same rules hold however a trip comes in.

export type TripDates = Pick<Trip, "person" | "leaveDate" | "backDate" | "place">;

// A trip longer than this is almost always a typo in the year
export const MAX_TRIP_DAYS = 366;

const tripSchema = z
  .object({
    person: z.string("Say who's going").trim().min(1, "Say who's going").max(40, "Use a first name"),
    leaveDate: z.iso.date("Choose the day you leave"),
    backDate: z.iso.date("Choose the day you're back"),
    place: z
      .string()
      .trim()
      .max(100, "Keep where to under 100 characters")
      .optional()
      .nullable()
      .transform((value) => value || null),
  })
  .refine((trip) => trip.backDate >= trip.leaveDate, { path: ["backDate"], message: "Back must be on or after leaving" })
  .refine((trip) => daysBetween(trip.leaveDate, trip.backDate) <= MAX_TRIP_DAYS, {
    path: ["backDate"],
    message: "That's over a year away; check the year",
  });

export type TripErrors = Partial<Record<keyof TripDates, string>>;

export function parseTrip(input: Record<string, unknown>): { success: true; data: TripDates } | { success: false; errors: TripErrors } {
  const result = tripSchema.safeParse({
    person: input.person ?? undefined,
    leaveDate: input.leaveDate ?? undefined,
    backDate: input.backDate ?? undefined,
    place: input.place ?? undefined,
  });
  if (result.success) return { success: true, data: result.data };
  const errors: TripErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof TripDates] ??= issue.message;
  return { success: false, errors };
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

// "Rita away · Lisbon"
export function tripTitle(trip: Pick<Trip, "person" | "place">) {
  return trip.place ? `${trip.person} away · ${trip.place}` : `${trip.person} away`;
}

// Names to suggest in the "Who" box: everyone who has had a trip, A to Z, without repeats
// whatever their case
export function knownPeople(names: string[]) {
  const seen = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// Grovelet changes only the trips of the housemate it's chatting with; names match whatever their case
export function samePerson(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
