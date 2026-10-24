import { z } from "zod";
import type { Application } from "@/db/schema";

// Stays housemates put on the calendar for their own guests, without an application. The dashboard
// and Grovelet both send them through parseStay, so the same rules hold however one comes in.
// They're kept with applications (addedBy set), approved from the start, unless Grovelet sends
// confirmed: false for a stay the house is still voting on in the guest chat. That one is pending
// until Grovelet approves it through /api/bot/applications/<id>/approve.

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
    confirmed: z.boolean("Say true or false for confirmed").default(true),
  })
  .refine((stay) => stay.departureDate >= stay.arrivalDate, {
    path: ["departureDate"],
    message: "Leaving must be on or after arriving",
  })
  .refine((stay) => daysBetween(stay.arrivalDate, stay.departureDate) <= MAX_STAY_DAYS, {
    path: ["departureDate"],
    message: "That's over a year away; check the year",
  });

export type StayErrors = Partial<Record<keyof StayInput | "confirmed", string>>;

// confirmed is kept out of data, because data is also what a change saves, and a change never
// touches whether a stay is confirmed
export function parseStay(
  input: Record<string, unknown>,
): { success: true; data: StayInput; confirmed: boolean } | { success: false; errors: StayErrors } {
  const result = staySchema.safeParse({
    addedBy: input.addedBy ?? undefined,
    name: input.name ?? undefined,
    partySize: input.partySize ?? undefined,
    arrivalDate: input.arrivalDate ?? undefined,
    departureDate: input.departureDate ?? undefined,
    confirmed: input.confirmed ?? undefined,
  });
  if (result.success) {
    const { confirmed, ...data } = result.data;
    return { success: true, data, confirmed };
  }
  const errors: StayErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof StayErrors] ??= issue.message;
  return { success: false, errors };
}

// The row to save: a housemate's stay is confirmed from the start unless said otherwise, and has no
// application text
export function stayRow(stay: StayInput, confirmed = true) {
  return { ...stay, status: confirmed ? ("approved" as const) : ("pending" as const), agreedToRules: false, email: null, about: null };
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}
