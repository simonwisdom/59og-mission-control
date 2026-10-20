import { desc, gte, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { APPLICATION_DAYS, botApplications } from "@/lib/bot-applications";
import { botTokenMatches } from "@/lib/bot-summary";

// Every detail of recent guest applications, for Grovelet to post new ones in the guest
// applications chat and answer housemates about them. Same key as the summary feed.

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

export async function GET(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const since = new Date(Date.now() - APPLICATION_DAYS * 86_400_000);
  const rows = await db
    .select()
    .from(applications)
    .where(or(gte(applications.createdAt, since), gte(applications.departureDate, londonToday())))
    .orderBy(desc(applications.createdAt));
  const ids = rows.map((row) => row.id);
  const rowNotes = ids.length ? await db.select().from(notes).where(inArray(notes.applicationId, ids)) : [];
  return Response.json(botApplications(rows, rowNotes), { headers: { "Cache-Control": "private, no-store" } });
}
