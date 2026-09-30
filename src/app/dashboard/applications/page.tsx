import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { STATUSES, isStatus } from "@/lib/review";
import { StatusBadge } from "../status-badge";
import { formatDate } from "@/lib/format";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = isStatus(statusParam) ? statusParam : undefined;

  const rows = await db
    .select()
    .from(applications)
    .where(status ? eq(applications.status, status) : undefined)
    .orderBy(desc(applications.createdAt));

  const tabs = [{ label: "All", value: undefined }, ...STATUSES.map((s) => ({ label: s, value: s }))];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="hand text-2xl">Guest applications</h1>
        <Link href="/apply" className="text-sm text-accent hover:underline" target="_blank">
          Open public form ↗
        </Link>
      </div>

      <nav className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `?status=${tab.value}` : "?"}
            className={`rounded-[2px] px-3 py-1 text-sm capitalize ${
              tab.value === status ? "bg-foreground text-background" : "border border-line"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="card text-muted">No applications here yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[2px] border border-line bg-surface">
          {rows.map((app) => (
            <li key={app.id}>
              <Link
                href={`/dashboard/applications/${app.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-background"
              >
                <div>
                  <div className="font-medium">
                    {app.name}
                    {app.partySize > 1 && <span className="text-muted"> +{app.partySize - 1}</span>}
                  </div>
                  <div className="text-sm text-muted">
                    {formatDate(app.arrivalDate)} to {formatDate(app.departureDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span>Applied {formatDate(app.createdAt)}</span>
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
