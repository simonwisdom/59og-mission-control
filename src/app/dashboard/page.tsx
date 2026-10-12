import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { getBinCollections, type Collection } from "@/lib/hackney-bins";
import { getEnergyUsage, type DailyUsage } from "@/lib/octopus";
import { MiniUsage } from "./energy/mini-usage";
import { PhoneSetup } from "./phone-setup";
import { UsefulLinks } from "./useful-links";

export const metadata: Metadata = { title: "Dashboard" };

// Guest and bin dates are London calendar days, so compare against today's date there
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const dayAndDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const BINS_PAGE = "https://www.hackney.gov.uk/rubbish-and-recycling/rubbish-recycling-and-food-waste-collections/check-your-collection-day";
const DAY_MS = 86_400_000;

// ["Recycling", "Food waste", "Rubbish"] → "recycling, food waste and rubbish"
function binList(bins: string[]) {
  const names = bins.map((bin) => bin.toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

// Bins go out the night before collection
function binTask(next: Collection, after: Collection | undefined, today: string) {
  const days = (Date.parse(next.date) - Date.parse(today)) / DAY_MS;
  const bins = binList(next.bins);
  const task =
    days === 0
      ? `The ${bins} get collected today`
      : days === 1
        ? `Put the ${bins} out tonight`
        : `Put the ${bins} out on ${weekday.format(new Date(Date.parse(next.date) - DAY_MS))} night`;
  const then = after && `Then ${dayAndDate.format(new Date(`${after.date}T00:00:00Z`))}: ${binList(after.bins)}.`;
  return { task, then };
}

// The meter reports a day or so late, so the newest day can be partly read; show only full days
const fullWeek = (days: DailyUsage[] | null) => (days ?? []).filter((day) => day.readings >= 46).slice(-7);

// Hackney and Octopus can take a few seconds when their cache is cold, so these two stream in
// after the rest of the page

async function BinDay({ today }: { today: string }) {
  const bins = await getBinCollections(today);
  const [nextBins, afterBins] = bins.status === "ok" ? bins.collections : [];
  if (!nextBins) {
    return (
      <a href={BINS_PAGE} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-pillar">
        Check bin day on Hackney&apos;s site ↗
      </a>
    );
  }
  const bin = binTask(nextBins, afterBins, today);
  return (
    <>
      <p className="font-medium">{bin.task}</p>
      {bin.then && <p className="text-sm text-muted">{bin.then}</p>}
    </>
  );
}

async function EnergyWeek() {
  // Two days more than shown, so partly read days at either end can be dropped
  const energy = await getEnergyUsage(9);
  const electricity = energy.status === "ok" ? fullWeek(energy.electricity) : [];
  const gas = energy.status === "ok" ? fullWeek(energy.gas) : [];
  if (electricity.length === 0 && gas.length === 0) {
    return <p className="mt-1 text-sm text-muted">Daily electricity and gas use from the smart meters</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
      <MiniUsage title="electricity" days={electricity} />
      <MiniUsage title="gas" days={gas} />
    </div>
  );
}

export default async function DashboardHome() {
  const today = londonToday();
  const [[{ pending }], guests] = await Promise.all([
    db.select({ pending: count() }).from(applications).where(eq(applications.status, "pending")),
    db
      .select({
        id: applications.id,
        name: applications.name,
        partySize: applications.partySize,
        arrivalDate: applications.arrivalDate,
        departureDate: applications.departureDate,
      })
      .from(applications)
      .where(and(eq(applications.status, "approved"), gte(applications.departureDate, today)))
      .orderBy(asc(applications.arrivalDate))
      .limit(3),
  ]);

  return (
    <>
      <h1 className="section-title mb-5">House services</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="card border-2 border-ink/80">
          <h2 className="hand text-xl">Coming up</h2>
          <ul className="mt-2 divide-y divide-line">
            <li className="py-3">
              <Suspense fallback={<p className="text-muted">Checking bin day…</p>}>
                <BinDay today={today} />
              </Suspense>
            </li>
            {pending > 0 && (
              <li className="py-3">
                <Link href="/dashboard/applications" className="font-medium hover:text-pillar">
                  {pending === 1 ? "A guest application" : `${pending} guest applications`} to look at
                </Link>
              </li>
            )}
          </ul>
        </section>

        <div className="grid content-start gap-3">
          <Link href="/dashboard/energy" className="card block hover:border-tile">
            <h2 className="hand text-lg">Energy, last 7 days</h2>
            <Suspense fallback={<p className="mt-1 text-sm text-muted">Reading the meters…</p>}>
              <EnergyWeek />
            </Suspense>
          </Link>
          <section className="card">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="hand text-lg">Next guests</h2>
              <Link href="/dashboard/calendar" className="text-sm text-muted hover:text-pillar">
                Calendar →
              </Link>
            </div>
            {guests.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No one booked</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {guests.map((guest) => (
                  <li key={guest.id}>
                    <Link href={`/dashboard/applications/${guest.id}`} className="font-medium hover:text-pillar">
                      {guest.name}
                    </Link>
                    {guest.partySize > 1 && <span className="text-muted"> and {guest.partySize - 1} more</span>}
                    <span className="block text-sm text-muted">
                      {guest.arrivalDate <= today ? "Here now, until " : `${formatDate(guest.arrivalDate)} to `}
                      {formatDate(guest.departureDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <UsefulLinks />
      <PhoneSetup />
    </>
  );
}
