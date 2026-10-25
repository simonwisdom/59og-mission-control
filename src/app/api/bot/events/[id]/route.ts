import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseEvent } from "@/lib/events";
import { samePerson } from "@/lib/trips";

// Grovelet changes or deletes an event here. It sends the name of the housemate it's chatting with,
// and only events that housemate added can change: anyone else's answers 403.

async function ownEvent(request: Request, ctx: RouteContext<"/api/bot/events/[id]">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return { error: new Response("Not found", { status: 404 }) };
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person : "";
  const [event] = Number.isInteger(id) ? await db.select().from(events).where(eq(events.id, id)) : [];
  if (!event) return { error: Response.json({ error: "No such event" }, { status: 404 }) };
  if (!person || !samePerson(event.addedBy, person)) {
    return { error: Response.json({ error: "Only the housemate who added this event can change it through Grovelet" }, { status: 403 }) };
  }
  return { event, body };
}

// Body: {"person", "title", "date", "endDate"?, "time"?, "place"?, "link"?}. Who added it stays as it was.
export async function PUT(request: Request, ctx: RouteContext<"/api/bot/events/[id]">) {
  const found = await ownEvent(request, ctx);
  if (found.error) return found.error;
  const parsed = parseEvent({ ...found.body, addedBy: found.event.addedBy });
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [event] = await db
    .update(events)
    .set({ ...parsed.data, updatedBy: "Grovelet", updatedAt: new Date() })
    .where(eq(events.id, found.event.id))
    .returning();
  return Response.json(event);
}

// Body: {"person"}
export async function DELETE(request: Request, ctx: RouteContext<"/api/bot/events/[id]">) {
  const found = await ownEvent(request, ctx);
  if (found.error) return found.error;
  await db.delete(events).where(eq(events.id, found.event.id));
  return new Response(null, { status: 204 });
}
