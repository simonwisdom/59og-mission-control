import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";

export default async function DashboardHome() {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(applications)
    .where(eq(applications.status, "pending"));

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">House services</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/applications" className="card block hover:border-accent">
          <h2 className="font-semibold">Guest applications</h2>
          <p className="mt-1 text-sm text-muted">
            {pending === 0 ? "Nothing waiting for review" : `${pending} waiting for review`}
          </p>
        </Link>
      </div>
    </>
  );
}
