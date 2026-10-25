import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { and, asc, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, events, trips } from "@/db/schema";
import { getSessionSecret, sessionName } from "@/lib/auth";
import { eventLabel } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { calendarFeedToken, isMonth, monthWeeks, shiftMonth } from "@/lib/guest-calendar";
import { REVIEWER_COOKIE } from "@/lib/review";
import { tripTitle } from "@/lib/trips";
import { Crumbs } from "../crumbs";
import { CopyLink } from "./copy-link";
import { EventForm } from "./event-form";
import { housemates } from "./people";
import { StayForm } from "./stay-form";
import { StayLegend, StayWeeks } from "./stay-weeks";
import { TripForm } from "./trip-form";

export const metadata: Metadata = { title: "Calendar" };

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
      addedBy: applications.addedBy,
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

  const [monthTrips, upcomingTrips, upcomingStays, monthEvents, upcomingEvents, people] = await Promise.all([
    db
      .select()
      .from(trips)
      .where(and(lte(trips.leaveDate, lastDay), gte(trips.backDate, firstDay)))
      .orderBy(asc(trips.leaveDate)),
    db.select().from(trips).where(gte(trips.backDate, today)).orderBy(asc(trips.leaveDate)),
    db
      .select()
      .from(applications)
      .where(and(isNotNull(applications.addedBy), gte(applications.departureDate, today)))
      .orderBy(asc(applications.arrivalDate)),
    db
      .select()
      .from(events)
      .where(and(lte(events.date, lastDay), gte(sql`coalesce(${events.endDate}, ${events.date})`, firstDay)))
      .orderBy(asc(events.date)),
    db
      .select()
      .from(events)
      .where(gte(sql`coalesce(${events.endDate}, ${events.date})`, today))
      .orderBy(asc(events.date)),
    housemates(),
  ]);
  // Fill in who's adding a trip: the name they last signed a note with, or their login link's first
  // word. A link can be named "the house", so the note name comes first.
  const me = (await cookies()).get(REVIEWER_COOKIE)?.value ?? (await sessionName())?.trim().split(/\s+/)[0] ?? "";

  const feedPath = `/calendar/${calendarFeedToken(getSessionSecret())}/guests.ics`;
  const feedUrl = `${await siteUrl()}${feedPath}`;
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <>
      <Crumbs />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Calendar</h1>
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <StayLegend />
        <Link href="/dashboard/applications" className="text-muted hover:text-pillar">
          All applications →
        </Link>
      </div>
      <StayWeeks weeks={weeks} stays={stays} trips={monthTrips} events={monthEvents} today={today} month={month} />

      <section className="card mt-8">
        <h2 className="hand text-lg">Going away?</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Add your trip so the house knows who&apos;s in. Everyone in the house can see it, and Grovelet tells
          anyone who asks.
        </p>
        <TripForm defaults={{ person: me }} people={people} />
        {upcomingTrips.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-medium">Trips coming up</h3>
            <ul className="mt-1 divide-y divide-line text-sm">
              {upcomingTrips.map((trip) => (
                <li key={trip.id}>
                  <Link href={`/dashboard/calendar/trips/${trip.id}`} className="flex flex-wrap justify-between gap-x-3 py-2 hover:text-pillar">
                    <span className="font-medium">{tripTitle(trip)}</span>
                    <span className="text-muted">
                      {formatDate(trip.leaveDate)} to {formatDate(trip.backDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card mt-8">
        <h2 className="hand text-lg">Having a guest?</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Add a friend or family member staying with you. It goes on the calendar as confirmed, with no
          application. Grovelet can add one too, in a chat.
        </p>
        <StayForm defaults={{ addedBy: me }} people={people} />
        {upcomingStays.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-medium">Housemates&apos; guests coming up</h3>
            <ul className="mt-1 divide-y divide-line text-sm">
              {upcomingStays.map((stay) => (
                <li key={stay.id}>
                  <Link href={`/dashboard/calendar/stays/${stay.id}`} className="flex flex-wrap justify-between gap-x-3 py-2 hover:text-pillar">
                    <span className="font-medium">
                      {stay.name} <span className="font-normal text-muted">({stay.addedBy}&apos;s guest)</span>
                    </span>
                    <span className="text-muted">
                      {formatDate(stay.arrivalDate)} to {formatDate(stay.departureDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card mt-8">
        <h2 className="hand text-lg">Something on?</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Add something the house might want to know about, like a dinner you&apos;re hosting or a gig
          you&apos;re going to. Grovelet tells anyone who asks what&apos;s on, mentions it in the morning post
          on the day, and can add one too, in a chat.
        </p>
        <EventForm defaults={{ addedBy: me }} people={people} />
        {upcomingEvents.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-medium">Events coming up</h3>
            <ul className="mt-1 divide-y divide-line text-sm">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/dashboard/calendar/events/${event.id}`} className="flex flex-wrap justify-between gap-x-3 py-2 hover:text-pillar">
                    <span className="font-medium">
                      {eventLabel(event)} <span className="font-normal text-muted">({event.addedBy})</span>
                    </span>
                    <span className="text-muted">
                      {formatDate(event.date)}
                      {event.endDate && ` to ${formatDate(event.endDate)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card mt-8">
        <h2 className="hand text-lg">Add to your own calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Subscribe once and new guests, housemates&apos; trips and events appear in your calendar by themselves.
          Requested stays show as &ldquo;Requested: name&rdquo; until they&apos;re approved; declined ones drop off.
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
