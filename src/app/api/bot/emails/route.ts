import { parseMailSearch, SEARCH_TEXT_LIMIT } from "@/lib/bot-mail-search";
import { botEmail, botTokenMatches } from "@/lib/bot-summary";
import { getMailbox, searchEmails } from "@/lib/house-mail";

// Grovelet's search_mail tool looks up the house Gmail here, any age, when a question needs more
// than the summary feed's recent mail. Same key as the summary feed; read-only.
// GET ?q=<1 to 8 words>&limit=<1 to 10, default 5> answers {"emails": [...] | null, "more": boolean}:
// emails is null when the house Gmail isn't connected, and more is true when more than limit matched.
export async function GET(request: Request) {
  if (!botTokenMatches(request.headers.get("authorization"), process.env.BOT_API_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }
  const parsed = parseMailSearch(new URL(request.url).searchParams);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const headers = { "Cache-Control": "private, no-store" };
  if (!(await getMailbox())) return Response.json({ emails: null, more: false }, { headers });

  const { rows, more } = await searchEmails(parsed.search);
  return Response.json({ emails: rows.map((row) => ({ id: row.id, ...botEmail(row, SEARCH_TEXT_LIMIT) })), more }, { headers });
}
