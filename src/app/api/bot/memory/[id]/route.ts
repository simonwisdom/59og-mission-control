import { revalidatePath } from "next/cache";
import { botTokenMatches } from "@/lib/bot-summary";
import { isLive } from "@/lib/memory";
import { findMemory, undoMemory } from "@/lib/memory-store";
import { samePerson } from "@/lib/trips";

// Grovelet's undo: the housemate who added a note or document takes it back, and the version it
// replaced comes back. Body: {"addedBy"}. Anything someone else added answers 403; the Memory page
// can forget anything. Nothing is deleted: it goes to History on the Memory page.
export async function DELETE(request: Request, ctx: RouteContext<"/api/bot/memory/[id]">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const addedBy = body && typeof body === "object" && typeof body.addedBy === "string" ? body.addedBy : "";
  const row = await findMemory(Number((await ctx.params).id));
  if (!row || !isLive(row)) return Response.json({ error: "No such memory" }, { status: 404 });
  if (!addedBy || !row.addedBy || !samePerson(row.addedBy, addedBy)) {
    return Response.json({ error: "Only the housemate who added it can take it back through Grovelet" }, { status: 403 });
  }
  await undoMemory(row, row.addedBy);
  revalidatePath("/dashboard", "layout");
  return new Response(null, { status: 204 });
}
