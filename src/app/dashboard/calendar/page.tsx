import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { and, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { getSessionSecret } from "@/lib/auth";
import { calendarFeedToken, isMonth, monthWeeks, shiftMonth, stayTitle } from "@/lib/guest-calendar";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Guest calendar" };

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Calendar apps need the full address of the feed, so build it from APP_URL or this request
async function siteUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  const proto = head.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const today = londonToday();
  const { month: monthParam } = await searchParams;
  const month = isMonth(monthParam) ? monthParam : today.slice(0, 7);
  const weeks = monthWeeks(month);
  const [firstDay, lastDay] = [weeks[0][0], weeks.at(-1)!.at(-1)!];

  const stays = await db
    .select({
      id: applications.id,
      name: applications.name,
      partySize: applications.partySize,
      arrivalDate: applications.arrivalDate,
      departureDate: applications.departureDate,
      status: applications.status,
    })
    .from(applications)
    .where(
      and(
        ne(applications.status, "declined"),
        lte(applications.arrivalDate, lastDay),
        gte(applications.departureDate, firstDay),
      ),
    )
    .orderBy(asc(applications.arrivalDate));

  const feedPath = `/calendar/${calendarFeedToken(getSessionSecret())}/guests.ics`;
  const feedUrl = `${await siteUrl()}${feedPath}`;
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Guest calendar</h1>
        <nav className="flex items-center gap-2 text-sm">
          <Link href={`?month=${shiftMonth(month, -1)}`} className="rounded-[2px] border border-line px-2 py-1 hover:border-tile" aria-label="Previous month">
            ←
          </Link>
          <span className="hand min-w-36 text-center text-lg">{monthName.format(new Date(`${month}-01T00:00:00Z`))}</span>
          <Link href={`?month=${shiftMonth(month, 1)}`} className="rounded-[2px] border border-line px-2 py-1 hover:border-tile" aria-label="Next month">
            →
          </Link>
          {month !== today.slice(0, 7) && (
            <Link href="?" className="ml-1 text-muted hover:underline">
              Today
            </Link>
          )}
        </nav>
      </div>

      <div className="mb-3 flex gap-4 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-[2px] bg-tile" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-[2px] border border-dashed border-amber-600 bg-amber-100 dark:bg-amber-900/40" />{" "}
          Requested
        </span>
      </div>

      <div className="overflow-hidden rounded-[2px] border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-card text-center text-xs text-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1.5">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week) => {
          const weekStays = stays.filter((s) => s.arrivalDate <= week[6] && s.departureDate >= week[0]);
          return (
            <div key={week[0]} className="grid min-h-20 grid-cols-7 content-start gap-y-1 border-b border-line pb-2 last:border-b-0">
              {week.map((day, i) => (
                <div
                  key={day}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                  className={`px-1.5 pt-1 text-xs ${day.slice(0, 7) === month ? "" : "text-muted/50"}`}
                >
                  <span className={day === today ? "rounded-full bg-pillar px-1.5 py-0.5 font-medium text-white" : ""}>
                    {Number(day.slice(8))}
                  </span>
                </div>
              ))}
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

      <section className="card mt-8">
        <h2 className="hand text-lg">Add to your own calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Subscribe once and new guests appear in your calendar by themselves. Requested stays show as
          &ldquo;Requested: name&rdquo; until they&apos;re approved; declined ones drop off.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={webcalUrl} className="rounded-[2px] bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90">
            Apple Calendar
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[2px] bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
          >
            Google Calendar ↗
          </a>
          <CopyLink url={feedUrl} />
        </div>
        <p className="mt-3 text-xs text-muted">
          The link works without the house password, so keep it within the house. Google can take
          several hours to pick up changes; Apple checks about once an hour.
        </p>
      </section>
    </>
  );
}
