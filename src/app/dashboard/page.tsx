import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";

const accountLinks: { name: string; note: string; href: string | null }[] = [
  { name: "Sainsbury's", note: "Online shopping", href: "https://www.sainsburys.co.uk/gol-ui/groceries" },
  { name: "Octopus Energy", note: "Gas and electricity", href: "https://octopus.energy/dashboard/" },
  { name: "Thames Water", note: "Water", href: "https://www.thameswater.co.uk/login" },
  { name: "Hyperoptic", note: "Internet", href: "https://www.hyperoptic.com/my-account/" },
  { name: "Hackney parking permits", note: "Resident e-permits", href: "https://permits.hackney.gov.uk/control/applyPermitHackney" },
  { name: "Hackney bike lockers", note: "Cycle hangars", href: "https://cyclehangars.hackney.gov.uk/sf/control/login" },
  { name: "Michael Morris", note: "Estate agent portal", href: null },
];

export default async function DashboardHome() {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(applications)
    .where(eq(applications.status, "pending"));

  return (
    <>
      <h1 className="hand mb-6 text-2xl">House services</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/applications" className="card block hover:border-accent">
          <h2 className="hand text-lg">Guest applications</h2>
          <p className="mt-1 text-sm text-muted">
            {pending === 0 ? "Nothing waiting for review" : `${pending} waiting for review`}
          </p>
        </Link>
        <Link href="/dashboard/energy" className="card block hover:border-accent">
          <h2 className="hand text-lg">Energy</h2>
          <p className="mt-1 text-sm text-muted">Daily electricity and gas use from the smart meters</p>
        </Link>
      </div>

      <h2 className="hand mt-10 mb-4 text-xl">Accounts</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accountLinks.map((link) =>
          link.href ? (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card block hover:border-accent"
            >
              <h3 className="hand text-lg">{link.name} ↗</h3>
              <p className="mt-1 text-sm text-muted">{link.note}</p>
            </a>
          ) : (
            <div key={link.name} className="card block opacity-60">
              <h3 className="hand text-lg">{link.name}</h3>
              <p className="mt-1 text-sm text-muted">{link.note}: link to come</p>
            </div>
          ),
        )}
      </div>
    </>
  );
}
