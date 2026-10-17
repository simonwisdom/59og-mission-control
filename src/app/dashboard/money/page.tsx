import type { Metadata } from "next";
import { getHouseFinances, type CategorySpend } from "@/lib/actual";
import { formatPence } from "@/lib/format";
import { Crumbs } from "../crumbs";
import { Checklist } from "./checklist";

export const metadata: Metadata = { title: "House money" };

const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const short = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

// Spending by category, each with a bar sized against the biggest
function SpendingBars({ rows }: { rows: CategorySpend[] }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <section className="card">
      <h2 className="legend">Spent on</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing spent yet this month.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="flex justify-between gap-3 text-sm">
                <span>{row.category}</span>
                <span className="tabular-nums">{formatPence(row.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-tile" style={{ width: `${(row.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MoneyPage() {
  const money = await getHouseFinances();
  const month = money.status === "ok" ? monthName.format(new Date(`${money.month}-01T00:00:00Z`)) : "";

  return (
    <>
      <Crumbs />
      <h1 className="hand mb-6 text-2xl">House money</h1>

      {money.status === "not-configured" && (
        <p className="card text-sm text-muted">
          To see the house account, set <code>ACTUAL_SERVER_URL</code>, <code>ACTUAL_PASSWORD</code> and{" "}
          <code>ACTUAL_SYNC_ID</code> on Railway. The sync ID is in Actual under Settings &gt; Show advanced settings.
        </p>
      )}
      {money.status === "error" && (
        <p className="card text-sm text-danger">Couldn&apos;t load the house account from Actual: {money.message}</p>
      )}
      {money.status === "ok" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {money.accounts.map((account) => (
              <section key={account.name} className="card">
                <h2 className="legend">{account.name}</h2>
                <p className={`mt-1 text-2xl font-medium tabular-nums ${account.balance < 0 ? "text-danger" : ""}`}>
                  {formatPence(account.balance)}
                </p>
              </section>
            ))}
          </div>

          <h2 className="section-title mt-8 mb-3">{month} so far</h2>
          <div className="grid items-start gap-3 md:grid-cols-2">
            <Checklist
              title="Shares"
              kind="share"
              payments={money.shares}
              empty="No regular payments in yet. Anyone who pays in most months shows here."
            />
            <Checklist
              title="Rent and bills"
              kind="bill"
              payments={money.bills}
              empty="No regular bills yet. Anything paid once a month, most months, shows here."
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Worked out from the last three months: anyone who paid in, and any bill that went out once a month, in at
            least two of them. A share is expected to match last month&apos;s; a bill shows what it came to this month
            once it&apos;s gone out. A payment shows as late three days after its usual day.
          </p>

          <p className="mt-6 mb-3">
            <span className="text-lg font-medium tabular-nums">{formatPence(money.moneyIn)}</span>{" "}
            <span className="text-muted">in</span> ·{" "}
            <span className="text-lg font-medium tabular-nums">{formatPence(money.moneyOut)}</span>{" "}
            <span className="text-muted">out in {month}</span>
          </p>
          <SpendingBars rows={money.spending} />

          <h2 className="section-title mt-8 mb-3">Recent</h2>
          <ul className="card divide-y divide-line py-1">
            {money.recent.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.payee}</p>
                  <p className="truncate text-sm text-muted">
                    {short(t.date)}
                    {t.category && ` · ${t.category}`}
                    {t.notes && ` · ${t.notes}`}
                    {money.accounts.length > 1 && ` · ${t.account}`}
                  </p>
                </div>
                <p className={`shrink-0 tabular-nums ${t.amount > 0 ? "font-medium" : ""}`}>
                  {t.amount > 0 ? "+" : ""}
                  {formatPence(t.amount)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            From the house budget in Actual, checked every few minutes. Moves between the house&apos;s own accounts
            aren&apos;t counted as money in or out.
          </p>
        </>
      )}
    </>
  );
}
