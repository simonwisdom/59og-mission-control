import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, type Application } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { botMayChangeStay, parseStay } from "@/lib/stays";
import { samePerson } from "@/lib/trips";

// Grovelet changes or deletes a housemate's stay here. It sends the name of the housemate it's
// chatting with as "person". Only the housemate whose guest it is (addedBy) can change the guest's
// name, dates or party size, or delete the stay. Any housemate can move it to another housemate
// (addedBy) or set its room, when that's all the change carries: Grovelet decides who may ask. An
// application can't be changed here at all. Anything not allowed answers 403.

async function findStay(
  request: Request,
  ctx: RouteContext<"/api/bot/stays/[id]">,
  allowed: (stay: Application, person: string, body: Record<string, unknown>) => boolean,
) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return { error: new Response("Not found", { status: 404 }) };
  }
  const id = Number((await ctx.params).id);
  const json = await request.json().catch(() => null);
  const body: Record<string, unknown> = json && typeof json === "object" ? json : {};
  const person = typeof body.person === "string" ? body.person : "";
  const [stay] = Number.isInteger(id) ? await db.select().from(applications).where(eq(applications.id, id)) : [];
  if (!stay) return { error: Response.json({ error: "No such stay" }, { status: 404 }) };
  if (!allowed(stay, person, body)) {
    return {
      error: Response.json(
        { error: "Only the housemate whose guest it is can change the guest, dates or party size, or delete the stay, through Grovelet" },
        { status: 403 },
      ),
    };
  }
  return { stay, body };
}

// Body: {"person"} and any of "name", "partySize", "arrivalDate", "departureDate", "addedBy",
// "room" (40 characters at most; null or "" clears it). What's left out stays as it was (Grovelet
// only sees a guest's first name), and so does whether it's confirmed (that only changes through
// approve). Answers the saved stay, 400 with {"errors": {field: message}}, 403 or 404.
export async function PUT(request: Request, ctx: RouteContext<"/api/bot/stays/[id]">) {
  const found = await findStay(request, ctx, botMayChangeStay);
  if (found.error) return found.error;
  const { name, partySize, arrivalDate, departureDate, addedBy, room } = found.stay;
  const parsed = parseStay({ name, partySize, arrivalDate, departureDate, addedBy, room, ...found.body, confirmed: undefined });
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [stay] = await db.update(applications).set(parsed.data).where(eq(applications.id, found.stay.id)).returning();
  return Response.json(stay);
}

// Body: {"person"}, who must be the housemate whose guest it is
export async function DELETE(request: Request, ctx: RouteContext<"/api/bot/stays/[id]">) {
  const found = await findStay(request, ctx, (stay, person) => !!person && !!stay.addedBy && samePerson(stay.addedBy, person));
  if (found.error) return found.error;
  await db.delete(applications).where(eq(applications.id, found.stay.id));
  return new Response(null, { status: 204 });
}
