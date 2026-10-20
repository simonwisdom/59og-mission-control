import { revalidatePath } from "next/cache";
import { botTokenMatches } from "@/lib/bot-summary";
import { botMemory, parseMemory } from "@/lib/memory";
import { liveMemories, saveMemory } from "@/lib/memory-store";

// Grovelet's memory, with the same key as the summary feed. GET gives every live note and document;
// Grovelet hands them to Claude as quoted facts, never as instructions.
export async function GET(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json(botMemory(await liveMemories()));
}

// Grovelet saves a note here once it has said so in the chat, and a document once the housemate
// said yes. Body: {"kind", "title"?, "body", "addedBy", "replacesId"?}. addedBy is the housemate
// Grovelet is chatting with, never a name from the message. replacesId is a live note this one
// corrects, which moves to History.
export async function POST(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseMemory(body && typeof body === "object" ? body : {});
  if (!parsed.success) return Response.json({ errors: parsed.errors }, { status: 400 });
  if (!parsed.data.addedBy) return Response.json({ errors: { addedBy: "Say who it's from" } }, { status: 400 });

  const replacesId = Number.isInteger(body.replacesId) ? body.replacesId : undefined;
  const row = await saveMemory(parsed.data, replacesId);
  revalidatePath("/dashboard", "layout");
  return Response.json({ id: row.id }, { status: 201 });
}
