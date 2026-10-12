import Link from "next/link";
import { stayTitle, type Stay } from "@/lib/guest-calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

// Weeks of days with each stay drawn as a bar across the days it covers. The calendar page
// passes the month it shows, so days outside it fade; the dashboard shows a run of weeks
// instead and names the month on the first day of each.
export function StayWeeks({
  weeks,
  stays,
  today,
  month,
  compact = false,
}: {
  weeks: string[][];
  stays: Stay[];
  today: string;
  month?: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[2px] border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-card text-center text-xs text-muted">
        {WEEKDAYS.map((day) => (
          <div key={day} className={compact ? "py-1" : "py-1.5"}>
            {compact ? day.slice(0, 1) : day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => {
        const weekStays = stays.filter((s) => s.arrivalDate <= week[6] && s.departureDate >= week[0]);
        return (
          <div
            key={week[0]}
            className={`grid grid-cols-7 content-start gap-y-1 border-b border-line last:border-b-0 ${compact ? "min-h-12 pb-1.5" : "min-h-20 pb-2"}`}
          >
            {week.map((day, i) => {
              const dayNumber = Number(day.slice(8));
              const namesMonth = !month && (dayNumber === 1 || (weekIndex === 0 && i === 0));
              return (
                <div
                  key={day}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                  className={`px-1.5 pt-1 text-xs ${month && day.slice(0, 7) !== month ? "text-muted/50" : ""} ${day < today && !month ? "text-muted" : ""}`}
                >
                  <span className={day === today ? "rounded-full bg-pillar px-1.5 py-0.5 font-medium text-white" : ""}>
                    {dayNumber}
                  </span>
                  {namesMonth && <span className="text-muted"> {shortMonth.format(new Date(`${day}T00:00:00Z`))}</span>}
                </div>
              );
            })}
            {weekStays.map((stay, row) => {
              const start = Math.max(0, week.indexOf(stay.arrivalDate));
              const endIndex = week.indexOf(stay.departureDate);
              const end = endIndex === -1 ? 6 : endIndex;
              const confirmed = stay.status === "approved";
              return (
                <Link
                  key={stay.id}
                  href={`/dashboard/applications/${stay.id}`}
                  title={stayTitle(stay)}
                  style={{ gridColumn: `${start + 1} / ${end + 2}`, gridRow: row + 2 }}
                  className={`mx-0.5 truncate rounded-[2px] px-1.5 py-0.5 text-xs font-medium ${
                    confirmed
                      ? "bg-tile text-white hover:opacity-90"
                      : "border border-dashed border-amber-600 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                  }`}
                >
                  {stay.arrivalDate < week[0] && "… "}
                  {confirmed ? stay.name : `${stay.name}?`}
                  {stay.partySize > 1 && ` +${stay.partySize - 1}`}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function StayLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-4 text-muted ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-5 rounded-[2px] bg-tile" /> Confirmed
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-5 rounded-[2px] border border-dashed border-amber-600 bg-amber-100 dark:bg-amber-900/40" />{" "}
        Requested
      </span>
    </div>
  );
}
