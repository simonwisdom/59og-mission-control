// The words and limit of a mail search from Grovelet (/api/bot/emails?q=<words>&limit=<n>). Grovelet's
// search_mail tool sends them; its stand-in for tests, search_fixture in grovelet's mailsearch.py,
// searches the same way as searchEmails in house-mail.ts.

export const MAX_WORDS = 8;
export const MAX_WORD_LENGTH = 40;
export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;
// Each email found comes back with its text cut to this many characters
export const SEARCH_TEXT_LIMIT = 8000;

export type MailSearch = { words: string[]; limit: number };

export function parseMailSearch(params: URLSearchParams): { ok: true; search: MailSearch } | { ok: false; error: string } {
  const words = (params.get("q") ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { ok: false, error: "q needs at least one word" };
  if (words.length > MAX_WORDS) return { ok: false, error: `q takes at most ${MAX_WORDS} words` };
  // Counted in characters, as Grovelet's Python counts them, not UTF-16 units
  if (words.some((word) => Array.from(word).length > MAX_WORD_LENGTH)) {
    return { ok: false, error: `Each word in q is at most ${MAX_WORD_LENGTH} characters` };
  }

  const limitParam = params.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    limit = /^\d+$/.test(limitParam) ? Number(limitParam) : NaN;
    if (!(limit >= 1 && limit <= MAX_LIMIT)) return { ok: false, error: `limit is a whole number from 1 to ${MAX_LIMIT}` };
  }

  // A word given twice counts once, whatever its case
  return { ok: true, search: { words: [...new Set(words.map((word) => word.toLowerCase()))], limit } };
}

// An ILIKE pattern that finds word anywhere, with \, % and _ taken literally
export function containsPattern(word: string) {
  return `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
