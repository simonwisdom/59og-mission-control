import { and, asc, count, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications, trips } from "@/db/schema";
import { getHouseFinances } from "@/lib/actual";
import { EMAIL_DAYS, TRIP_DAYS, botSummary, botTokenMatches } from "@/lib/bot-summary";
import { getBinCollections } from "@/lib/hackney-bins";
import { getMailbox, recentEmails, syncHouseMailWithin } from "@/lib/house-mail";

// The read-only feed Grovelet, the house chat bot, reads. It sits outside /dashboard because the
// bot can't log in; BOT_API_TOKEN is the check instead, and the feed is off until it's set.

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
// Stays from today through the next 90 days, so a housemate can change a guest's stay at Christmas
// from October; Grovelet's own lists still say only the next four weeks
const STAY_DAYS = 90;

export async function GET(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }

  const today = londonToday();
  const daysAhead = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const until = daysAhead(STAY_DAYS);
  const [[{ pending }], stays, housemateTrips, bins, money, mail] = await Promise.all([
    db.select({ pending: count() }).from(applications).where(eq(applications.status, "pending")),
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
      .where(
        and(
          ne(applications.status, "declined"),
          lte(applications.arrivalDate, until),
          gte(applications.departureDate, today),
        ),
      )
      .orderBy(asc(applications.arrivalDate)),
    db
      .select()
      .from(trips)
      .where(and(gte(trips.backDate, today), lte(trips.leaveDate, daysAhead(TRIP_DAYS))))
      .orderBy(asc(trips.leaveDate)),
    getBinCollections(today),
    getHouseFinances(),
    houseMail(),
  ]);

  const summary = botSummary({
    today,
    bins: bins.status === "ok" ? bins.collections : [],
    pendingApplications: pending,
    stays,
    trips: housemateTrips,
    shares: money.status === "ok" ? money.shares : null,
    emails: mail,
  });
  return Response.json(summary, { headers: { "Cache-Control": "private, no-store" } });
}

// The last two weeks of the house Gmail, after checking for new mail for up to 5 seconds so the bot
// isn't kept waiting; null when the account isn't connected
async function houseMail() {
  if (!(await getMailbox())) return null;
  await syncHouseMailWithin(5000);
  return recentEmails(15, new Date(Date.now() - EMAIL_DAYS * 86_400_000));
}
