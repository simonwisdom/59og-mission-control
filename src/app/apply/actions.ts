"use server";

import { after } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { parseApplication, type FieldErrors } from "@/lib/application-schema";
import { overlapsBooked } from "@/lib/guest-calendar";
import { notifyNewApplication } from "@/lib/notify";
import { upcomingBookedNights } from "./booked";

export type ApplyState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; values: Record<string, string> }
  | { status: "submitted" };

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: real people never see or fill this field, bots usually do.
  if (formData.get("website")) return { status: "submitted" };

  const result = parseApplication(formData);
  const values = () =>
    Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)]));
  if (!result.success) {
    return { status: "error", errors: result.errors, values: values() };
  }
  // The picker already rules out booked nights, but a stay may have been approved since the page loaded
  if (overlapsBooked(result.data, await upcomingBookedNights())) {
    const errors = { arrivalDate: "Someone is already staying on some of those nights. Please pick other dates." };
    return { status: "error", errors, values: values() };
  }

  const [saved] = await db.insert(applications).values(result.data).returning();
  // After the response, so a slow or failing ntfy never holds up or breaks the guest's submission.
  after(() =>
    notifyNewApplication(saved).catch((error) =>
      console.error(`Couldn't send the ntfy notification for application ${saved.id}:`, error),
    ),
  );
  return { status: "submitted" };
}
