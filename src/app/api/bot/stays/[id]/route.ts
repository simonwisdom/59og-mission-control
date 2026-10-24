import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseStay } from "@/lib/stays";
import { samePerson } from "@/lib/trips";

// Grovelet changes or deletes a housemate's stay here. It sends the name of the housemate it's
// chatting with, and only stays that housemate added can change: an application, or anyone
// else's guest, answers 403.

async function ownStay(request: Request, ctx: RouteContext<"/api/bot/stays/[id]">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return { error: new Response("Not found", { status: 404 }) };
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person : "";
  const [stay] = Number.isInteger(id) ? await db.select().from(applications).where(eq(applications.id, id)) : [];
  if (!stay) return { error: Response.json({ error: "No such stay" }, { status: 404 }) };
  if (!person || !stay.addedBy || !samePerson(stay.addedBy, person)) {
    return { error: Response.json({ error: "Only the housemate who added this stay can change it through Grovelet" }, { status: 403 }) };
  }
  return { stay, body };
}

// Body: {"person"} and any of "name", "partySize", "arrivalDate", "departureDate"; what's left out
// stays as it was (Grovelet only sees a guest's first name), and so does who added it and whether
// it's confirmed (that only changes through approve).
export async function PUT(request: Request, ctx: RouteContext<"/api/bot/stays/[id]">) {
  const found = await ownStay(request, ctx);
  if (found.error) return found.error;
  const { name, partySize, arrivalDate, departureDate } = found.stay;
  const parsed = parseStay({ name, partySize, arrivalDate, departureDate, ...found.body, addedBy: found.stay.addedBy, confirmed: undefined });
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [stay] = await db.update(applications).set(parsed.data).where(eq(applications.id, found.stay.id)).returning();
  return Response.json(stay);
}

// Body: {"person"}
export async function DELETE(request: Request, ctx: RouteContext<"/api/bot/stays/[id]">) {
  const found = await ownStay(request, ctx);
  if (found.error) return found.error;
  await db.delete(applications).where(eq(applications.id, found.stay.id));
  return new Response(null, { status: 204 });
}
