import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { approvalRefusal, parseExpectedStay } from "@/lib/bot-applications";
import { botTokenMatches } from "@/lib/bot-summary";

// Grovelet approves a guest application here after a housemate said yes in a chat, which puts the
// stay on the calendar as confirmed. Same key as the summary feed. Body: {"person"}, the housemate
// Grovelet was chatting with; a note on the application says they approved it through Grovelet.
// A housemate's stay added as not confirmed (confirmed: false on /api/bot/stays) is confirmed here
// the same way, once the guest chat has agreed. Only a pending one can be approved this way;
// anything else answers 409. The body can also carry "arrivalDate", "departureDate" and
// "partySize" as the guest chat voted on them: if any differs from the stay now, it answers 409
// {"error": "This stay has changed", "changed": true} and approves nothing.
export async function POST(request: Request, ctx: RouteContext<"/api/bot/applications/[id]/approve">) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const person = body && typeof body === "object" && typeof body.person === "string" ? body.person.trim().slice(0, 40) : "";
  if (!person) return Response.json({ error: "Say who's approving" }, { status: 400 });
  const expected = parseExpectedStay(body);
  if (!expected.success) return Response.json({ error: expected.error }, { status: 400 });

  const select = () => db.select().from(applications).where(eq(applications.id, id));
  const [application] = Number.isInteger(id) ? await select() : [];
  const refusal = approvalRefusal(application, expected.data);
  if (refusal) return Response.json(refusal.body, { status: refusal.status });

  // Still pending and unchanged as it's saved, so two approvals at once leave one note, and a change
  // made in between isn't approved
  const { arrivalDate, departureDate, partySize } = expected.data;
  const [approved] = await db
    .update(applications)
    .set({ status: "approved" })
    .where(
      and(
        eq(applications.id, id),
        eq(applications.status, "pending"),
        arrivalDate === undefined ? undefined : eq(applications.arrivalDate, arrivalDate),
        departureDate === undefined ? undefined : eq(applications.departureDate, departureDate),
        partySize === undefined ? undefined : eq(applications.partySize, partySize),
      ),
    )
    .returning();
  if (!approved) {
    const [now] = await select();
    const late = approvalRefusal(now, expected.data) ?? { status: 409, body: { error: "This application is already approved" } };
    return Response.json(late.body, { status: late.status });
  }
  await db.insert(notes).values({ applicationId: id, author: person, body: "Approved through Grovelet." });
  return Response.json(approved);
}
