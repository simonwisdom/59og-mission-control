const DAY_MS = 24 * 60 * 60 * 1000;

// How far ahead to start warning, e.g. to book the gas safety check in time
export const DUE_SOON_DAYS = 60;

export type ExpiryStatus = "none" | "ok" | "soon" | "expired";

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS);
}

export function expiryStatus(expiresOn: string | null, today: string): ExpiryStatus {
  if (!expiresOn) return "none";
  const days = daysUntil(expiresOn, today);
  if (days < 0) return "expired";
  if (days <= DUE_SOON_DAYS) return "soon";
  return "ok";
}

// Only web links, so a saved link can't run script when clicked
export function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
