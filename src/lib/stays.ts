import { z } from "zod";
import type { Application } from "@/db/schema";

// Stays housemates put on the calendar for their own guests, without an application. The dashboard
// and Grovelet both send them through parseStay, so the same rules hold however one comes in.
// They're kept with applications (addedBy set), approved from the start.

export type StayInput = Pick<Application, "name" | "partySize" | "arrivalDate" | "departureDate"> & { addedBy: string };

// A stay longer than this is almost always a typo in the year
export const MAX_STAY_DAYS = 366;

const staySchema = z
  .object({
    addedBy: z.string("Say whose guest it is").trim().min(1, "Say whose guest it is").max(40, "Use a first name"),
    name: z.string("Say who's coming").trim().min(1, "Say who's coming").max(200, "Keep the name under 200 characters"),
    partySize: z.coerce
      .number("Say how many people")
      .int("Say how many people")
      .min(1, "At least 1 person")
      .max(20, "That's a lot of people"),
    arrivalDate: z.iso.date("Choose the day they arrive"),
    departureDate: z.iso.date("Choose the day they leave"),
  })
  .refine((stay) => stay.departureDate >= stay.arrivalDate, {
    path: ["departureDate"],
    message: "Leaving must be on or after arriving",
  })
  .refine((stay) => daysBetween(stay.arrivalDate, stay.departureDate) <= MAX_STAY_DAYS, {
    path: ["departureDate"],
    message: "That's over a year away; check the year",
  });

export type StayErrors = Partial<Record<keyof StayInput, string>>;

export function parseStay(input: Record<string, unknown>): { success: true; data: StayInput } | { success: false; errors: StayErrors } {
  const result = staySchema.safeParse({
    addedBy: input.addedBy ?? undefined,
    name: input.name ?? undefined,
    partySize: input.partySize ?? undefined,
    arrivalDate: input.arrivalDate ?? undefined,
    departureDate: input.departureDate ?? undefined,
  });
  if (result.success) return { success: true, data: result.data };
  const errors: StayErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof StayInput] ??= issue.message;
  return { success: false, errors };
}

// The row to save: a housemate's stay is confirmed from the start, and has no application text
export function stayRow(stay: StayInput) {
  return { ...stay, status: "approved" as const, agreedToRules: false, email: null, about: null };
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}
