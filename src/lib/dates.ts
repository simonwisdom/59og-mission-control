// Date arithmetic on "YYYY-MM-DD" strings in UTC. No server-only imports, so the apply form's
// date picker can use it in the browser.

const DAY_MS = 86_400_000;

// "2026-10-12" → "2026-10-13"
export function nextDay(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

// Mondays-first weeks covering the month ("2026-10"), each day as "YYYY-MM-DD", with the
// neighbouring months' days filling the first and last weeks
export function monthWeeks(month: string) {
  const first = Date.parse(`${month}-01T00:00:00Z`);
  const mondayOffset = (new Date(first).getUTCDay() + 6) % 7;
  let day = first - mondayOffset * DAY_MS;
  const weeks: string[][] = [];
  do {
    const week = Array.from({ length: 7 }, (_, i) => new Date(day + i * DAY_MS).toISOString().slice(0, 10));
    weeks.push(week);
    day += 7 * DAY_MS;
  } while (new Date(day).toISOString().slice(0, 7) === month);
  return weeks;
}

// A run of Monday-first weeks starting with the week that holds the day ("2026-10-12")
export function weeksFrom(date: string, count: number) {
  const day = Date.parse(`${date}T00:00:00Z`);
  const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
  return Array.from({ length: count }, (_, week) =>
    Array.from({ length: 7 }, (_, i) => new Date(monday + (week * 7 + i) * DAY_MS).toISOString().slice(0, 10)),
  );
}

// "2026-10" plus or minus a number of months
export function shiftMonth(month: string, by: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

export const isMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
