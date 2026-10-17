import { CircleAlert, CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import type { RegularPayment } from "@/lib/actual";
import { formatPence } from "@/lib/format";

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const short = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

// 1 → "1st", 22 → "22nd", 13 → "13th"
export function ordinal(day: number) {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
  return `${day}${suffix}`;
}

const days = (count: number) => (count === 1 ? "1 day" : `${count} days`);

// How this month is going for one share or bill, in a few words
export function paymentStatus(payment: RegularPayment, kind: "share" | "bill") {
  const usually = `usually the ${ordinal(payment.usualDay)}`;
  switch (payment.status) {
    case "paid":
      return kind === "share" ? `Paid ${short(payment.lastPaidOn!)}` : `Went out ${short(payment.lastPaidOn!)}`;
    case "part-paid":
      return `${formatPence(payment.paid)} of ${formatPence(payment.expected)} paid`;
    case "due":
      return kind === "share" ? `Due around the ${ordinal(payment.usualDay)}` : `Goes out around the ${ordinal(payment.usualDay)}`;
    case "late":
      return kind === "share" ? `${days(payment.daysLate)} late, ${usually}` : `Hasn't gone out, ${usually}`;
  }
}

const icons = {
  paid: <CircleCheck className="size-5 text-tile" aria-label="Paid" />,
  "part-paid": <CircleDot className="size-5 text-danger" aria-label="Part paid" />,
  due: <CircleDashed className="size-5 text-muted" aria-label="Not due yet" />,
  late: <CircleAlert className="size-5 text-danger" aria-label="Late" />,
};

// One row per housemate's share or per bill, with a tick, a dashed circle or a warning
export function Checklist({
  title,
  payments,
  kind,
  empty,
}: {
  title: string;
  payments: RegularPayment[];
  kind: "share" | "bill";
  empty: string;
}) {
  const done = payments.filter((p) => p.status === "paid").length;
  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="legend">{title}</h2>
        {payments.length > 0 && (
          <p className="text-sm text-muted">
            {done} of {payments.length} {kind === "share" ? "paid" : "gone out"}
          </p>
        )}
      </div>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {payments.map((p) => {
            const attention = p.status === "late" || p.status === "part-paid";
            return (
              <li key={p.payee} className="flex items-center gap-3 py-2.5">
                <span className="shrink-0">{icons[p.status]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.payee}</p>
                  <p className={`text-sm ${attention ? "text-danger" : "text-muted"}`}>{paymentStatus(p, kind)}</p>
                </div>
                {/* Bills vary, so one that has gone out shows what it came to this month */}
                <p className="shrink-0 tabular-nums text-muted">
                  {formatPence(kind === "bill" && p.paid > 0 ? p.paid : p.expected)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
