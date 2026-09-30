import { applicationStatus, type ApplicationStatus } from "@/db/schema";

export const STATUSES = applicationStatus.enumValues;

export function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

// Remembers a housemate's name on their device so they don't retype it on every note.
export const REVIEWER_COOKIE = "reviewer_name";
