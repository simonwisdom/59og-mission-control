const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Postgres `date` columns come back as "YYYY-MM-DD"; parse as UTC so the day doesn't shift.
export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return dateFormat.format(date);
}

const poundsFormat = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

// Whole pence, as Actual stores money: 123456 → "£1,234.56"
export function formatPence(pence: number) {
  return poundsFormat.format(pence / 100);
}
