import { db } from "@/db";
import { applications } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseStay, stayRow } from "@/lib/stays";

// Grovelet adds a housemate's own guest here after they've said yes in a chat. Same key as the
// summary feed. Body: {"person", "name", "partySize", "arrivalDate", "departureDate", "confirmed"?}.
// Grovelet sends the name of the housemate it's chatting with as person, never a name from the
// message, and the stay is saved as theirs (addedBy), confirmed. With "confirmed": false it's saved
// pending instead, while the guest chat votes on it, and Grovelet confirms it later through
// /api/bot/applications/<id>/approve.
export async function POST(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const input = body && typeof body === "object" ? body : {};
  const parsed = parseStay({ ...input, addedBy: input.person });
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [stay] = await db.insert(applications).values(stayRow(parsed.data, parsed.confirmed)).returning();
  return Response.json(stay, { status: 201 });
}
