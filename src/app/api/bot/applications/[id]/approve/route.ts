import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { approvalRefusal } from "@/lib/bot-applications";
import { botTokenMatches } from "@/lib/bot-summary";

// Grovelet approves a guest application here after a housemate said yes in a chat, which puts the
// stay on the calendar as confirmed. Same key as the summary feed. Body: {"person"}, the housemate
// Grovelet was chatting with; a note on the application says they approved it through Grovelet.
// A housemate's stay added as not confirmed (confirmed: false on /api/bot/stays) is confirmed here
// the same way, once the guest chat has agreed. Only a pending one can be approved this way;
// anything else answers 409.
export async function POST(request: Request, ctx: RouteContext<"/api/bot/applications/[id]/approve">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person.trim().slice(0, 40) : "";
  if (!person) return Response.json({ error: "Say who's approving" }, { status: 400 });

  const [application] = Number.isInteger(id) ? await db.select().from(applications).where(eq(applications.id, id)) : [];
  const refusal = approvalRefusal(application);
  if (refusal) return Response.json({ error: refusal.error }, { status: refusal.status });

  // Still pending as it's saved, so two approvals at once leave one note
  const [approved] = await db
    .update(applications)
    .set({ status: "approved" })
    .where(and(eq(applications.id, id), eq(applications.status, "pending")))
    .returning();
  if (!approved) {
    return Response.json({ error: `This ${application?.addedBy ? "stay" : "application"} is already approved` }, { status: 409 });
  }
  await db.insert(notes).values({ applicationId: id, author: person, body: "Approved through Grovelet." });
  return Response.json(approved);
}
