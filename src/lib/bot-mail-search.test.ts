import { existsSync } from "node:fs";
import { TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { containsPattern, parseMailSearch } from "./bot-mail-search";

// The matching itself is SQL, so these run it against the local database on this Mac, inside a
// transaction that's rolled back: nothing they add is kept. The words are made up (xyz…) so mail
// already in the local copy can't match them.
if (existsSync(".env")) process.loadEnvFile(".env");
const dbHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null;
if (dbHost !== "localhost" && dbHost !== "127.0.0.1") {
  throw new Error(`DATABASE_URL points at ${dbHost}, not this Mac; refusing to run the mail search tests`);
}
process.env.BOT_API_TOKEN = "test-bot-token";

let db: typeof import("@/db").db;
let emails: typeof import("@/db/schema").emails;
let searchEmails: typeof import("./house-mail").searchEmails;
let GET: typeof import("@/app/api/bot/emails/route").GET;
beforeAll(async () => {
  ({ db } = await import("@/db"));
  ({ emails } = await import("@/db/schema"));
  ({ searchEmails } = await import("./house-mail"));
  ({ GET } = await import("@/app/api/bot/emails/route"));
});

let gmailIds = 0;
const email = (fields: { subject?: string; fromName?: string; fromAddress?: string; to?: string; body?: string; sentAt: string; deleted?: boolean }) => ({
  gmailId: `mail-search-test-${++gmailIds}`,
  threadId: "mail-search-test",
  fromName: "Someone",
  fromAddress: "someone@example.com",
  to: "House <house@example.com>",
  subject: "Hello",
  body: "Nothing to see",
  attachments: [],
  labels: ["INBOX"],
  ...fields,
  sentAt: new Date(fields.sentAt),
});

// The subjects searchEmails finds among rows, in order, and whether there were more
async function search(rows: ReturnType<typeof email>[], q: string, limit?: number) {
  const parsed = parseMailSearch(new URLSearchParams(limit ? { q, limit: String(limit) } : { q }));
  if (!parsed.ok) throw new Error(parsed.error);
  let found: { subjects: string[]; more: boolean } | undefined;
  await db
    .transaction(async (tx) => {
      await tx.insert(emails).values(rows);
      const { rows: hits, more } = await searchEmails(parsed.search, tx);
      found = { subjects: hits.map((hit) => hit.subject), more };
      tx.rollback();
    })
    .catch((error) => {
      if (!(error instanceof TransactionRollbackError)) throw error;
    });
  return found!;
}

describe("parseMailSearch", () => {
  const parse = (params: Record<string, string>) => parseMailSearch(new URLSearchParams(params));

  it("takes words separated by spaces, a word given twice once, and limit 5 by default", () => {
    expect(parse({ q: "  Boiler  engineer boiler BOILER " })).toEqual({ ok: true, search: { words: ["boiler", "engineer"], limit: 5 } });
    expect(parse({ q: "boiler", limit: "10" })).toEqual({ ok: true, search: { words: ["boiler"], limit: 10 } });
  });

  it("turns away no words, more than 8, a word over 40 characters, or a limit outside 1 to 10", () => {
    for (const params of [
      {} as Record<string, string>,
      { q: "   " },
      { q: "a b c d e f g h i" },
      { q: "x".repeat(41) },
      { q: "boiler", limit: "0" },
      { q: "boiler", limit: "11" },
      { q: "boiler", limit: "2.5" },
      { q: "boiler", limit: "five" },
      { q: "boiler", limit: "" },
    ]) {
      expect(parse(params).ok, JSON.stringify(params)).toBe(false);
    }
    expect(parse({ q: "a b c d e f g h", limit: "1" }).ok).toBe(true);
    expect(parse({ q: "é".repeat(40) }).ok).toBe(true);
  });

  it("escapes % and _ (and \\) so they're taken literally", () => {
    expect(containsPattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});

describe("searchEmails", () => {
  it("finds an email holding any of the words, in the subject, sender, recipients or text", async () => {
    const found = await search(
      [
        email({ subject: "Xyzboiler service", sentAt: "2026-10-01T10:00:00Z" }),
        email({ subject: "From name", fromName: "Xyzplumber Ltd", sentAt: "2026-10-02T10:00:00Z" }),
        email({ subject: "From address", fromAddress: "hello@xyzplumber.example", sentAt: "2026-10-03T10:00:00Z" }),
        email({ subject: "To", to: "Xyzagent <a@example.com>", sentAt: "2026-10-04T10:00:00Z" }),
        email({ subject: "Body", body: "The xyzboiler is fixed", sentAt: "2026-10-05T10:00:00Z" }),
        email({ subject: "Unrelated", sentAt: "2026-10-06T10:00:00Z" }),
      ],
      "xyzboiler xyzplumber xyzagent",
      10,
    );
    expect(found).toEqual({ subjects: ["Body", "To", "From address", "From name", "Xyzboiler service"], more: false });
  });

  it("puts those holding the most words first, then newest, and counts a word held twice once", async () => {
    const found = await search(
      [
        email({ subject: "Old, both words", body: "xyzgas and xyzmeter", sentAt: "2025-01-01T10:00:00Z" }),
        email({ subject: "New, one word many times", body: "xyzgas xyzgas xyzgas XYZGAS", sentAt: "2026-10-20T10:00:00Z" }),
        email({ subject: "Newer, one word", body: "xyzmeter", sentAt: "2026-10-25T10:00:00Z" }),
        email({ subject: "Newest, both words", body: "XyzMeter reading for xyzGAS", sentAt: "2026-10-30T10:00:00Z" }),
      ],
      "xyzgas XYZMETER xyzgas",
    );
    expect(found.subjects).toEqual(["Newest, both words", "Old, both words", "Newer, one word", "New, one word many times"]);
  });

  it("takes % and _ literally", async () => {
    const found = await search(
      [
        email({ subject: "xyz50% off", sentAt: "2026-10-01T10:00:00Z" }),
        email({ subject: "xyz500 off", sentAt: "2026-10-02T10:00:00Z" }),
        email({ subject: "xyz_a", sentAt: "2026-10-03T10:00:00Z" }),
        email({ subject: "xyzba", sentAt: "2026-10-04T10:00:00Z" }),
      ],
      "xyz50% xyz_a",
    );
    expect(found.subjects).toEqual(["xyz_a", "xyz50% off"]);
  });

  it("leaves out deleted emails", async () => {
    const found = await search(
      [
        email({ subject: "Kept xyzlockbox", sentAt: "2026-10-01T10:00:00Z" }),
        email({ subject: "Deleted xyzlockbox", sentAt: "2026-10-02T10:00:00Z", deleted: true }),
      ],
      "xyzlockbox",
    );
    expect(found).toEqual({ subjects: ["Kept xyzlockbox"], more: false });
  });

  it("gives at most limit emails, and more when others matched", async () => {
    const rows = [1, 2, 3].map((day) => email({ subject: `xyzrent ${day}`, sentAt: `2026-10-0${day}T10:00:00Z` }));
    expect(await search(rows, "xyzrent", 2)).toEqual({ subjects: ["xyzrent 3", "xyzrent 2"], more: true });
    expect(await search(rows, "xyzrent", 3)).toEqual({ subjects: ["xyzrent 3", "xyzrent 2", "xyzrent 1"], more: false });
  });

  it("brings bodies back cut just past 8,000 characters, for botEmail to cut and mark", async () => {
    const rows = [email({ subject: "xyzlong", body: "a".repeat(20_000), sentAt: "2026-10-01T10:00:00Z" })];
    const parsed = parseMailSearch(new URLSearchParams({ q: "xyzlong" }));
    if (!parsed.ok) throw new Error(parsed.error);
    let length = 0;
    await db
      .transaction(async (tx) => {
        await tx.insert(emails).values(rows);
        length = (await searchEmails(parsed.search, tx)).rows[0].body.length;
        tx.rollback();
      })
      .catch((error) => {
        if (!(error instanceof TransactionRollbackError)) throw error;
      });
    expect(length).toBe(8001);
  });
});

describe("GET /api/bot/emails", () => {
  const get = (query: string, token = "test-bot-token") =>
    GET(new Request(`http://localhost/api/bot/emails?${query}`, { headers: { authorization: `Bearer ${token}` } }));

  it("is not found without the right token", async () => {
    expect((await get("q=boiler", "wrong")).status).toBe(404);
    expect((await GET(new Request("http://localhost/api/bot/emails?q=boiler"))).status).toBe(404);
  });

  it("answers 400 to a bad q or limit", async () => {
    for (const query of ["", "q=", `q=${"x".repeat(41)}`, "q=a+b+c+d+e+f+g+h+i", "q=boiler&limit=11"]) {
      const response = await get(query);
      expect(response.status, query).toBe(400);
      expect(await response.json()).toHaveProperty("error");
    }
  });
});
