import { db } from "@/db";
import { events } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";
import { parseEvent } from "@/lib/events";

// Grovelet adds an event here: one a housemate asked it to put on the calendar in a one-to-one
// chat, or one someone posted in the house chat. Same key as the summary feed. Body:
// {"addedBy", "title", "date", "endDate"?, "time"?, "place"?, "link"?}. addedBy is the housemate
// it's chatting with, or who posted, never a name from the message.
export async function POST(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseEvent(body && typeof body === "object" ? body : {});
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });

  const [event] = await db.insert(events).values({ ...parsed.data, updatedBy: "Grovelet" }).returning();
  return Response.json(event, { status: 201 });
}
