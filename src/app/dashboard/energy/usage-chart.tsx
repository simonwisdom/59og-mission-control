import type { DailyUsage } from "@/lib/octopus";
import { formatDate } from "@/lib/format";

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const short = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));
const pounds = (value: number, digits = 2) => `£${value.toFixed(digits)}`;

// Daily kWh as a bar chart, with costs in the headline and table when the tariff was priced. Plain HTML bars so it stays crisp at any width.
export function UsageChart({ title, days }: { title: string; days: DailyUsage[] }) {
  if (days.length === 0) {
    return (
      <section className="card">
        <h2 className="legend">{title}</h2>
        <p className="mt-2 text-sm text-muted">No readings from the meter yet.</p>
      </section>
    );
  }

  const total = days.reduce((sum, day) => sum + day.kWh, 0);
  const max = Math.max(...days.map((day) => day.kWh), 0.1);
  const priced = days.every((day) => day.cost !== null);
  const totalCost = days.reduce((sum, day) => sum + (day.cost ?? 0), 0);

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="legend">{title}</h2>
        <p className="text-sm text-muted">
          {short(days[0].date)} to {short(days[days.length - 1].date)}
        </p>
      </div>
      {priced ? (
        <>
          <p className="mt-1 text-2xl font-medium">
            {Math.round(total)} kWh · {pounds(totalCost, 0)}
          </p>
          <p className="text-sm text-muted">
            {(total / days.length).toFixed(1)} kWh, {pounds(totalCost / days.length)} a day on average
          </p>
        </>
      ) : (
        <p className="mt-1">
          <span className="text-2xl font-medium">{Math.round(total)} kWh</span>{" "}
          <span className="text-sm text-muted">· {(total / days.length).toFixed(1)} kWh a day on average</span>
        </p>
      )}

      <div className="relative mt-5">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span className="absolute -top-2.5 right-0 bg-paper pl-1 text-xs text-muted">{max.toFixed(1)} kWh</span>
        <div className="flex h-40 items-end gap-[2px] border-b border-line pt-3">
          {days.map((day) => (
            <div key={day.date} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-tile group-hover:bg-ink"
                style={{ height: `${Math.max((day.kWh / max) * 100, 1)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[2px] border border-line bg-paper px-2 py-1 text-xs shadow group-hover:block">
                {formatDate(day.date)}: <strong>{day.kWh.toFixed(1)} kWh</strong>
                {day.cost !== null && <> · {pounds(day.cost)}</>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{short(days[0].date)}</span>
          <span>{short(days[days.length - 1].date)}</span>
        </div>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Show as a table</summary>
        <table className="mt-2 w-full">
          <tbody>
            {[...days].reverse().map((day) => (
              <tr key={day.date} className="border-t border-line">
                <td className="py-1">{formatDate(day.date)}</td>
                <td className="py-1 text-right tabular-nums">{day.kWh.toFixed(1)} kWh</td>
                {priced && <td className="py-1 text-right tabular-nums">{pounds(day.cost ?? 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
