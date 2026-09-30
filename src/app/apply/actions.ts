"use server";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { parseApplication, type FieldErrors } from "@/lib/application-schema";

export type ApplyState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; values: Record<string, string> }
  | { status: "submitted" };

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: real people never see or fill this field, bots usually do.
  if (formData.get("website")) return { status: "submitted" };

  const result = parseApplication(formData);
  if (!result.success) {
    const values = Object.fromEntries(
      [...formData.entries()].map(([key, value]) => [key, String(value)]),
    );
    return { status: "error", errors: result.errors, values };
  }

  await db.insert(applications).values(result.data);
  return { status: "submitted" };
}
