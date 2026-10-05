import type { DailyUsage } from "@/lib/octopus";

// A week of daily kWh as small bars with the week's total, for the dashboard. The full chart is
// on the Energy page.
export function MiniUsage({ title, days }: { title: string; days: DailyUsage[] }) {
  if (days.length === 0) return null;
  const max = Math.max(...days.map((day) => day.kWh), 0.1);
  const priced = days.every((day) => day.cost !== null);
  const total = priced
    ? `£${days.reduce((sum, day) => sum + (day.cost ?? 0), 0).toFixed(0)}`
    : `${Math.round(days.reduce((sum, day) => sum + day.kWh, 0))} kWh`;

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
      <p className="leading-tight">
        <span className="text-lg font-medium tabular-nums">{total}</span> <span className="text-muted">{title}</span>
      </p>
    </div>
  );
}
