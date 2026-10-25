import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { and, asc, gte, lte, ne, sql } from "drizzle-orm";
import { CalendarPlus } from "lucide-react";
import { db } from "@/db";
import { applications, events, trips } from "@/db/schema";
import { getSessionSecret, sessionName } from "@/lib/auth";
import { eventEnd } from "@/lib/events";
import { formatPartySize } from "@/lib/field-labels";
import { calendarFeedToken, isMonth, monthWeeks, shiftMonth, stayPath } from "@/lib/guest-calendar";
import { REVIEWER_COOKIE } from "@/lib/review";
import { Crumbs } from "../crumbs";
import { AddPanel } from "./add-panel";
import { CopyLink } from "./copy-link";
import { housemates } from "./people";
import { StayLegend, StayWeeks, Swatch, type SwatchKind } from "./stay-weeks";

export const metadata: Metadata = { title: "Calendar" };

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayOf = (date: string) => shortDay.format(new Date(`${date}T00:00:00Z`));
// How far ahead Coming up looks; the month view shows anything later
const COMING_DAYS = 60;

// Calendar apps need the full address of the feed, so build it from APP_URL or this request
async function siteUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  const proto = head.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// One line of Coming up: a guest, a trip or an event
type Upcoming = { key: string; kind: SwatchKind; start: string; end: string; title: string; detail: string; href: string };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const today = londonToday();
  const { month: monthParam } = await searchParams;
  const month = isMonth(monthParam) ? monthParam : today.slice(0, 7);
  const weeks = monthWeeks(month);
  const [firstDay, lastDay] = [weeks[0][0], weeks.at(-1)!.at(-1)!];
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + COMING_DAYS * 86_400_000).toISOString().slice(0, 10);
  // Everything that overlaps from..to: the month on show, or Coming up
  const between = (from: string, to: string) =>
    Promise.all([
      db
        .select({
          id: applications.id,
          name: applications.name,
          partySize: applications.partySize,
          arrivalDate: applications.arrivalDate,
          departureDate: applications.departureDate,
          status: applications.status,
          addedBy: applications.addedBy,
        })
        .from(applications)
        .where(and(ne(applications.status, "declined"), lte(applications.arrivalDate, to), gte(applications.departureDate, from)))
        .orderBy(asc(applications.arrivalDate)),
      db.select().from(trips).where(and(lte(trips.leaveDate, to), gte(trips.backDate, from))).orderBy(asc(trips.leaveDate)),
      db
        .select()
        .from(events)
        .where(and(lte(events.date, to), gte(sql`coalesce(${events.endDate}, ${events.date})`, from)))
        .orderBy(asc(events.date)),
    ]);

  const [[stays, monthTrips, monthEvents], [comingStays, comingTrips, comingEvents], people] = await Promise.all([
    between(firstDay, lastDay),
    between(today, horizon),
    housemates(),
  ]);
  // Fill in who's adding something: the name they last signed a note with, or their login link's
  // first word. A link can be named "the house", so the note name comes first.
  const me = (await cookies()).get(REVIEWER_COOKIE)?.value ?? (await sessionName())?.trim().split(/\s+/)[0] ?? "";

  const upcoming: Upcoming[] = [
    ...comingStays.map((stay) => ({
      key: `stay-${stay.id}`,
      kind: (stay.status === "approved" ? "confirmed" : "requested") as SwatchKind,
      start: stay.arrivalDate,
      end: stay.departureDate,
      title: stay.partySize > 1 ? `${stay.name} (${formatPartySize(stay.partySize)})` : stay.name,
      detail: [stay.addedBy ? `${stay.addedBy}'s guest` : "Applied to stay", stay.status === "approved" ? "" : "not confirmed yet"]
        .filter(Boolean)
        .join(", "),
      href: stayPath(stay),
    })),
    ...comingTrips.map((trip) => ({
      key: `trip-${trip.id}`,
      kind: "away" as SwatchKind,
      start: trip.leaveDate,
      end: trip.backDate,
      title: `${trip.person} away`,
      detail: trip.place ?? "",
      href: `/dashboard/calendar/trips/${trip.id}`,
    })),
    ...comingEvents.map((event) => ({
      key: `event-${event.id}`,
      kind: "event" as SwatchKind,
      start: event.date,
      end: eventEnd(event),
      title: event.title,
      detail: [event.time, event.place, `added by ${event.addedBy}`].filter(Boolean).join(" · "),
      href: `/dashboard/calendar/events/${event.id}`,
    })),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  const feedPath = `/calendar/${calendarFeedToken(getSessionSecret())}/guests.ics`;
  const feedUrl = `${await siteUrl()}${feedPath}`;
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <>
      <Crumbs />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="section-title">Calendar</h1>
        <a href="#add" className="btn-secondary flex items-center gap-1.5">
          <CalendarPlus className="size-4" strokeWidth={1.75} aria-hidden /> Add
        </a>
      </div>

      <section className="card border-2 border-ink/80 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`?month=${shiftMonth(month, -1)}`}
            className="flex size-9 items-center justify-center rounded-[2px] border border-line hover:border-ink"
            aria-label="Previous month"
          >
            ←
          </Link>
          <div className="text-center">
            <span className="hand block text-lg">{monthName.format(new Date(`${month}-01T00:00:00Z`))}</span>
            {month !== today.slice(0, 7) && (
              <Link href="?" className="text-xs text-muted hover:text-pillar hover:underline">
                Back to today
              </Link>
            )}
          </div>
          <Link
            href={`?month=${shiftMonth(month, 1)}`}
            className="flex size-9 items-center justify-center rounded-[2px] border border-line hover:border-ink"
            aria-label="Next month"
          >
            →
          </Link>
        </div>
        <StayWeeks weeks={weeks} stays={stays} trips={monthTrips} events={monthEvents} today={today} month={month} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <StayLegend />
          <Link href="/dashboard/applications" className="text-muted hover:text-pillar">
            Applications →
          </Link>
        </div>
      </section>

      {/* Coming up beside Add on a wide screen, one under the other on a phone */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ComingUp items={upcoming} today={today} />
        <AddPanel me={me} people={people} />
      </div>

      <details className="group card mt-6 border-2 border-ink/80 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="hand text-base">Add to your own calendar</span>
            <span className="text-muted"> · Apple, Google</span>
          </span>
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-muted">
            Subscribe once and guests, trips and events appear in your own calendar by themselves. Requested stays show as
            &ldquo;Requested: name&rdquo; until they&apos;re approved.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={webcalUrl} className="rounded-[2px] bg-foreground px-3 py-1.5 text-background hover:opacity-90">
              Apple Calendar
            </a>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[2px] bg-foreground px-3 py-1.5 text-background hover:opacity-90"
            >
              Google Calendar ↗
            </a>
            <CopyLink url={feedUrl} />
          </div>
          <p className="mt-3 text-xs text-muted">
            The link works without the house password, so keep it within the house. Google can take several hours to pick up
            changes; Apple checks about once an hour.
          </p>
        </div>
      </details>
    </>
  );
}

// Guests, trips and events in the next two months, soonest first, with a heading where a new month starts
function ComingUp({ items, today }: { items: Upcoming[]; today: string }) {
  return (
    <section className="card border-2 border-ink/80">
      <h2 className="hand text-lg">Coming up</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing on the calendar for the next two months.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item, i) => (
            <li key={item.key}>
              {i > 0 && items[i - 1].start.slice(0, 7) !== item.start.slice(0, 7) && (
                <p className="pt-4 pb-1 text-xs tracking-[0.08em] text-muted uppercase">
                  {monthName.format(new Date(`${item.start.slice(0, 7)}-01T00:00:00Z`))}
                </p>
              )}
              <Link href={item.href} className="group flex items-start gap-3 py-2.5">
                <span className="w-[5.5rem] shrink-0 text-sm">
                  <span className="block font-medium">{item.start < today ? "Now" : dayOf(item.start)}</span>
                  {item.end !== item.start && <span className="block text-xs text-muted">to {dayOf(item.end)}</span>}
                </span>
                <Swatch kind={item.kind} className="mt-1 h-4 w-1.5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium group-hover:text-pillar">{item.title}</span>
                  {item.detail && <span className="block truncate text-sm text-muted">{item.detail}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
