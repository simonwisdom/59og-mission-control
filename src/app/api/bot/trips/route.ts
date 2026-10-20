import { db } from "@/db";
import { trips } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseTrip } from "@/lib/trips";

// Grovelet adds a housemate's trip here after they've said yes to the dates in a one-to-one chat.
// Same key as the summary feed. Body: {"person", "leaveDate", "backDate", "place"?}. Grovelet
// sends the name of the housemate it's chatting with, never a name from the message.
export async function POST(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseTrip(body && typeof body === "object" ? body : {});
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [trip] = await db.insert(trips).values({ ...parsed.data, updatedBy: "Grovelet" }).returning();
  return Response.json(trip, { status: 201 });
}
