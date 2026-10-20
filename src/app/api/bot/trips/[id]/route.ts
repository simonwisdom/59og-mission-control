import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseTrip, samePerson } from "@/lib/trips";

// Grovelet changes or deletes a trip here. It sends the name of the housemate it's chatting with,
// and only that housemate's own trips can change: anyone else's answers 403.

async function ownTrip(request: Request, ctx: RouteContext<"/api/bot/trips/[id]">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return { error: new Response("Not found", { status: 404 }) };
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person : "";
  const [trip] = Number.isInteger(id) ? await db.select().from(trips).where(eq(trips.id, id)) : [];
  if (!trip) return { error: Response.json({ error: "No such trip" }, { status: 404 }) };
  if (!person || !samePerson(trip.person, person)) {
    return { error: Response.json({ error: "Only the person going can change this trip through Grovelet" }, { status: 403 }) };
  }
  return { trip, body };
}

// Body: {"person", "leaveDate", "backDate", "place"?}. The person stays as it was.
export async function PUT(request: Request, ctx: RouteContext<"/api/bot/trips/[id]">) {
  const found = await ownTrip(request, ctx);
  if (found.error) return found.error;
  const parsed = parseTrip({ ...found.body, person: found.trip.person });
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [trip] = await db
    .update(trips)
    .set({ ...parsed.data, updatedBy: "Grovelet", updatedAt: new Date() })
    .where(eq(trips.id, found.trip.id))
    .returning();
  return Response.json(trip);
}

// Body: {"person"}
export async function DELETE(request: Request, ctx: RouteContext<"/api/bot/trips/[id]">) {
  const found = await ownTrip(request, ctx);
  if (found.error) return found.error;
  await db.delete(trips).where(eq(trips.id, found.trip.id));
  return new Response(null, { status: 204 });
}
