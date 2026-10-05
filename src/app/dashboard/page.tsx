import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { UsefulLinks } from "./useful-links";

export default async function DashboardHome() {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(applications)
    .where(eq(applications.status, "pending"));

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
          <p className="mt-1 text-sm text-muted">Daily electricity and gas use from the smart meters</p>
        </Link>
      </div>
      <UsefulLinks />
    </>
  );
}
