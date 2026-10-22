import { and, asc, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications, trips } from "@/db/schema";
import { getSessionSecret } from "@/lib/auth";
import { feedTokenMatches, guestFeed } from "@/lib/guest-calendar";

// The subscribable house calendar: guests and housemates' trips. It sits outside /dashboard because calendar apps can't log
// in; the secret in the path is the check instead.
export async function GET(_request: Request, ctx: RouteContext<"/calendar/[token]/guests.ics">) {
  const { token } = await ctx.params;
  if (!feedTokenMatches(token, getSessionSecret())) {
    return new Response("Not found", { status: 404 });
  }

  // Confirmed and requested stays, and trips, from the last few months onwards
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const housemateTrips = await db.select().from(trips).where(gte(trips.backDate, since)).orderBy(asc(trips.leaveDate));
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
    .where(and(ne(applications.status, "declined"), gte(applications.departureDate, since)))
    .orderBy(asc(applications.arrivalDate));

  return new Response(guestFeed(stays, { appUrl: process.env.APP_URL, trips: housemateTrips }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
