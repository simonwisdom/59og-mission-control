import type { DailyUsage } from "@/lib/octopus";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// A week of daily kWh as small bars, for the dashboard tile. The full chart is on the Energy page.
export function MiniUsage({ title, days }: { title: string; days: DailyUsage[] }) {
  if (days.length === 0) return null;
  const max = Math.max(...days.map((day) => day.kWh), 0.1);
  const last = days[days.length - 1];
  const priced = days.every((day) => day.cost !== null);
  const weekCost = days.reduce((sum, day) => sum + (day.cost ?? 0), 0);

  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-20 shrink-0 items-end gap-[2px] border-b border-line" aria-hidden>
        {days.map((day) => (
          <div
            key={day.date}
            className="flex-1 rounded-t-[2px] bg-tile"
            style={{ height: `${Math.max((day.kWh / max) * 100, 4)}%` }}
          />
        ))}
      </div>
      <p className="text-sm leading-tight">
        <span className="font-medium">{title}</span>{" "}
        <span className="text-muted">
          {weekday.format(new Date(`${last.date}T00:00:00Z`))}: {last.kWh.toFixed(1)} kWh
          {priced && <> · £{weekCost.toFixed(0)} over {days.length} days</>}
        </span>
      </p>
    </div>
  );
}
