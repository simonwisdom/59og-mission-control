const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Postgres `date` columns come back as "YYYY-MM-DD"; parse as UTC so the day doesn't shift.
export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return dateFormat.format(date);
}
