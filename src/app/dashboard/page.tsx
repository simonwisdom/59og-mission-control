import Link from "next/link";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { getEnergyUsage } from "@/lib/octopus";
import { MiniUsage } from "./energy/mini-usage";
import { UsefulLinks } from "./useful-links";

// Guest dates are London calendar days, so compare against today's date there
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

export default async function DashboardHome() {
  const today = londonToday();
  const [[{ pending }], guests, energy] = await Promise.all([
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
  ]);

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
      </div>
      <UsefulLinks />
    </>
  );
}
