import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { and, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { getSessionSecret } from "@/lib/auth";
import { calendarFeedToken, isMonth, monthWeeks, shiftMonth } from "@/lib/guest-calendar";
import { CopyLink } from "./copy-link";
import { StayLegend, StayWeeks } from "./stay-weeks";

export const metadata: Metadata = { title: "Guest calendar" };

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

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

      <StayLegend className="mb-3 text-sm" />
      <StayWeeks weeks={weeks} stays={stays} today={today} month={month} />

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
