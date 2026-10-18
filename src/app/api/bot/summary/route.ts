import { and, asc, count, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { getHouseFinances } from "@/lib/actual";
import { botSummary, botTokenMatches } from "@/lib/bot-summary";
import { getBinCollections } from "@/lib/hackney-bins";

// The read-only feed Grovelet, the house chat bot, reads. It sits outside /dashboard because the
// bot can't log in; BOT_API_TOKEN is the check instead, and the feed is off until it's set.

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
// Stays from today through the next four weeks
const STAY_DAYS = 28;

export async function GET(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }

  const today = londonToday();
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + STAY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [[{ pending }], stays, bins, money] = await Promise.all([
    db.select({ pending: count() }).from(applications).where(eq(applications.status, "pending")),
    db
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
          lte(applications.arrivalDate, until),
          gte(applications.departureDate, today),
        ),
      )
      .orderBy(asc(applications.arrivalDate)),
    getBinCollections(today),
    getHouseFinances(),
  ]);

  const summary = botSummary({
    today,
    bins: bins.status === "ok" ? bins.collections : [],
    pendingApplications: pending,
    stays,
    shares: money.status === "ok" ? money.shares : null,
  });
  return Response.json(summary, { headers: { "Cache-Control": "private, no-store" } });
}
