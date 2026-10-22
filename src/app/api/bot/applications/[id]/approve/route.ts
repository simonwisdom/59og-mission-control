import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { botTokenMatches } from "@/lib/bot-summary";

// Grovelet approves a guest application here after a housemate said yes in a chat, which puts the
// stay on the calendar as confirmed. Same key as the summary feed. Body: {"person"}, the housemate
// Grovelet was chatting with; a note on the application says they approved it through Grovelet.
// Only a pending application can be approved this way; anything else answers 409.
export async function POST(request: Request, ctx: RouteContext<"/api/bot/applications/[id]/approve">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person.trim().slice(0, 40) : "";
  if (!person) return Response.json({ error: "Say who's approving" }, { status: 400 });

  const [application] = Number.isInteger(id) ? await db.select().from(applications).where(eq(applications.id, id)) : [];
  if (!application || application.addedBy) return Response.json({ error: "No such application" }, { status: 404 });
  if (application.status !== "pending") {
    return Response.json({ error: `This application is already ${application.status}` }, { status: 409 });
  }

  // Still pending as it's saved, so two approvals at once leave one note
  const [approved] = await db
    .update(applications)
    .set({ status: "approved" })
    .where(and(eq(applications.id, id), eq(applications.status, "pending")))
    .returning();
  if (!approved) return Response.json({ error: "This application is already approved" }, { status: 409 });
  await db.insert(notes).values({ applicationId: id, author: person, body: "Approved through Grovelet." });
  return Response.json(approved);
}
