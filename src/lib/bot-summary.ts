import type { RegularPayment } from "./actual";
import { passwordMatches } from "./session";
import type { Collection } from "./hackney-bins";
import type { DailyUsage } from "./octopus";
import type { Stay } from "./guest-calendar";

// A short read-only summary for Grovelet, the house chat bot: what's coming up, energy use and
// who has paid their share. Grovelet posts what it reads into the house group chat, where people
// who aren't on the dashboard can see it, so this carries only what's fine to say there:
// guests' first names (never their application text), no balances and no amounts.
// Needs BOT_API_TOKEN, which Grovelet sends as a bearer token; without it the feed is off.

export type BotSummary = {
  // "2026-10-18", London
  today: string;
  // The next two bin collections
  bins: Collection[];
  pendingApplications: number;
  // Confirmed and requested stays from today through the next four weeks, soonest first
  stays: { firstName: string; partySize: number; arrivalDate: string; departureDate: string; confirmed: boolean }[];
  // The last seven full days from the smart meters, or null when Octopus isn't set up or failed
  energy: { electricity: BotEnergyDay[]; gas: BotEnergyDay[] } | null;
  // Each housemate's share this month, or null when Actual isn't set up or failed
  shares: { name: string; status: RegularPayment["status"]; usualDay: number; lastPaidOn: string | null; daysLate: number }[] | null;
};
type BotEnergyDay = { date: string; kWh: number; cost: number | null };

export function botTokenMatches(header: string | null, token: string | undefined) {
  if (!token || !header?.startsWith("Bearer ")) return false;
  return passwordMatches(header.slice("Bearer ".length), token);
}

// The meter reports a day or so late, so the newest day can be partly read; keep only full days
const fullWeek = (days: DailyUsage[] | null) =>
  (days ?? [])
    .filter((day) => day.readings >= 46)
    .slice(-7)
    .map(({ date, kWh, cost }) => ({ date, kWh: Math.round(kWh * 10) / 10, cost: cost === null ? null : Math.round(cost * 100) / 100 }));

export function botSummary(input: {
  today: string;
  bins: Collection[];
  pendingApplications: number;
  stays: Stay[];
  energy: { electricity: DailyUsage[] | null; gas: DailyUsage[] | null } | null;
  shares: RegularPayment[] | null;
}): BotSummary {
  return {
    today: input.today,
    bins: input.bins.slice(0, 2),
    pendingApplications: input.pendingApplications,
    stays: input.stays
      .filter((stay) => stay.status !== "declined")
      .map((stay) => ({
        firstName: stay.name.trim().split(/\s+/)[0],
        partySize: stay.partySize,
        arrivalDate: stay.arrivalDate,
        departureDate: stay.departureDate,
        confirmed: stay.status === "approved",
      })),
    energy: input.energy && { electricity: fullWeek(input.energy.electricity), gas: fullWeek(input.energy.gas) },
    shares:
      input.shares?.map((share) => ({
        name: share.payee,
        status: share.status,
        usualDay: share.usualDay,
        lastPaidOn: share.lastPaidOn,
        daysLate: share.daysLate,
      })) ?? null,
  };
}
