import Link from "next/link";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { getBinCollections, type Collection } from "@/lib/hackney-bins";
import { getEnergyUsage } from "@/lib/octopus";
import { MiniUsage } from "./energy/mini-usage";
import { UsefulLinks } from "./useful-links";

// Guest dates are London calendar days, so compare against today's date there
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

const binDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const BINS_PAGE = "https://www.hackney.gov.uk/rubbish-and-recycling/rubbish-recycling-and-food-waste-collections/check-your-collection-day";

function collectionLabel(collection: Collection, today: string) {
  const days = (Date.parse(collection.date) - Date.parse(today)) / 86_400_000;
  const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : binDay.format(new Date(`${collection.date}T00:00:00Z`));
  return { when, bins: collection.bins.join(", ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) };
}

export default async function DashboardHome() {
  const today = londonToday();
  const [[{ pending }], guests, energy, bins] = await Promise.all([
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
    // One day more than shown, so the first, partly read day can be dropped
    getEnergyUsage(8),
    getBinCollections(today),
  ]);
  const nextCollections = bins.status === "ok" ? bins.collections.slice(0, 2) : [];

  return (
    <>
      <h1 className="section-title mb-5">House services</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/applications" className="card block border-2 border-ink/80 hover:border-tile">
          <h2 className="hand text-lg">Guest applications</h2>
          <p className="mt-1 text-sm text-muted">
            {pending === 0 ? "Nothing waiting for review" : `${pending} waiting for review`}
          </p>
        </Link>
        <Link href="/dashboard/energy" className="card block border-2 border-ink/80 hover:border-tile">
          <h2 className="hand text-lg">Energy</h2>
          {energy.status === "ok" && (energy.electricity?.length || energy.gas?.length) ? (
            <div className="mt-2 space-y-2">
              {energy.electricity && <MiniUsage title="Electricity" days={energy.electricity.slice(-7)} />}
              {energy.gas && <MiniUsage title="Gas" days={energy.gas.slice(-7)} />}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">Daily electricity and gas use from the smart meters</p>
          )}
        </Link>
        <section className="card border-2 border-ink/80">
          <h2 className="hand text-lg">Next guests</h2>
          {guests.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No approved stays coming up</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {guests.map((guest) => (
                <li key={guest.id}>
                  <Link href={`/dashboard/applications/${guest.id}`} className="font-medium hover:text-tile">
                    {guest.name}
                  </Link>
                  {guest.partySize > 1 && <span className="text-muted"> +{guest.partySize - 1}</span>}
                  <span className="block text-muted">
                    {guest.arrivalDate <= today ? "Staying now, until " : `${formatDate(guest.arrivalDate)} to `}
                    {formatDate(guest.departureDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card border-2 border-ink/80">
          <h2 className="hand text-lg">Bin day</h2>
          {nextCollections.length === 0 ? (
            <p className="mt-1 text-sm text-muted">
              <a href={BINS_PAGE} target="_blank" rel="noopener noreferrer" className="hover:text-tile">
                Check the collection day on Hackney&apos;s site ↗
              </a>
            </p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {nextCollections.map((collection, i) => {
                const { when, bins: binList } = collectionLabel(collection, today);
                return (
                  <li key={collection.date} className={i > 0 ? "text-muted" : undefined}>
                    <span className="font-medium">{when}</span>
                    <span className="block text-muted">{binList}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <UsefulLinks />
    </>
  );
}
