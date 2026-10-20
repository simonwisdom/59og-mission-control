// Reads the house's shared Gmail account into the emails table, so the dashboard and Grovelet can
// read it. The same pattern as Simon's inbox (~/Documents/2026/inbox, lib/inbox_gmail.py):
// read-only access, the last 30 days first, then only what changed, from Gmail's history.
//
// A housemate connects the account from the Email page: Google's web sign-in with a random
// single-use state and PKCE (S256), asking only for gmail.readonly. The refresh token is kept in
// house_mailbox and only ever sent to Google's token endpoint.
// Needs GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (an OAuth client of type "Web application") and
// APP_URL, which makes the address Google sends the housemate back to.
// Docs: https://developers.google.com/workspace/gmail/api/guides/sync
import { createHash, randomBytes } from "node:crypto";
import PostalMime, { type Address } from "postal-mime";

export const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const BACKFILL_DAYS = 30;
// Messages fetched per sync, so the first one doesn't run for minutes; the next sync carries on
export const MAX_PER_SYNC = 200;
const PAGE = 100;
// Spam, trash, drafts and chat are never stored
export const SKIP_LABELS = ["SPAM", "TRASH", "DRAFT", "CHAT"];
// Bigger messages keep their fields but not their raw bytes: only big attachments get there
export const RAW_LIMIT = 2 * 1024 * 1024;
const BODY_LIMIT = 100_000;

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.APP_URL);
}

export function redirectUri() {
  return new URL("/dashboard/email/callback", process.env.APP_URL).toString();
}

// ---------- sign-in ----------

// Holds the sign-in's state and PKCE verifier between the Connect button and the callback
export const SIGN_IN_COOKIE = "gmail_sign_in";

export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authUrl(clientId: string, redirect: string, state: string, challenge: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // A refresh token, so the server can read the mailbox after the housemate has gone
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URI}?${params}`;
}

export class GmailError extends Error {}

async function tokenRequest(fields: Record<string, string>) {
  const response = await fetch(TOKEN_URI, { method: "POST", body: new URLSearchParams(fields) });
  const body = (await response.json().catch(() => ({}))) as Record<string, string>;
  return { status: response.status, body };
}

// Swaps the code Google sent back for a refresh token, and checks only read access was granted
export async function exchangeCode(code: string, verifier: string) {
  const { status, body } = await tokenRequest({
    code,
    code_verifier: verifier,
    client_id: process.env.GMAIL_CLIENT_ID!,
    client_secret: process.env.GMAIL_CLIENT_SECRET!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  if (status !== 200 || !body.refresh_token) {
    throw new GmailError(`Google didn't hand over access (HTTP ${status} ${body.error ?? ""})`.trim());
  }
  if (!body.scope?.split(" ").includes(SCOPE)) throw new GmailError("Google didn't grant read access to the mail");
  const profile = await gmailGet<{ emailAddress: string; historyId: string }>(body.access_token, "profile");
  return { refreshToken: body.refresh_token, address: profile.emailAddress };
}

// Access tokens last an hour; keep one per refresh token until a minute before it runs out
const accessTokens = new Map<string, { token: string; until: number }>();

export async function accessToken(refreshToken: string) {
  const cached = accessTokens.get(refreshToken);
  if (cached && Date.now() < cached.until) return cached.token;
  const { status, body } = await tokenRequest({
    refresh_token: refreshToken,
    client_id: process.env.GMAIL_CLIENT_ID!,
    client_secret: process.env.GMAIL_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });
  if (status !== 200 || !body.access_token) {
    // invalid_grant: the access was taken away in Google, or the app is still in Testing (7-day tokens)
    throw new GmailError(
      body.error === "invalid_grant"
        ? "Google no longer accepts the login. Connect the house Gmail again."
        : `Couldn't refresh the Gmail login (HTTP ${status})`,
    );
  }
  accessTokens.set(refreshToken, { token: body.access_token, until: Date.now() + (Number(body.expires_in) - 60) * 1000 });
  return body.access_token;
}

// ---------- the Gmail API ----------

class NotFound extends GmailError {}

async function gmailGet<T>(token: string, path: string, params: Record<string, string | string[]> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of [value].flat()) query.append(key, v);
  }
  const response = await fetch(`${API}/${path}${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) throw new NotFound(`${path}: not found`);
  if (!response.ok) throw new GmailError(`Gmail ${path.split("/")[0]}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

type RawMessage = { id: string; threadId: string; labelIds?: string[]; internalDate?: string; raw?: string };

export type ParsedEmail = {
  gmailId: string;
  threadId: string;
  fromName: string;
  fromAddress: string;
  to: string;
  subject: string;
  sentAt: Date;
  body: string;
  attachments: { filename: string; mimeType: string; size: number }[];
  labels: string[];
  raw: Buffer | null;
};

// One message, or null when it's gone or never wanted (spam, trash, drafts, chat)
async function fetchMessage(token: string, id: string): Promise<ParsedEmail | null> {
  let message: RawMessage;
  try {
    message = await gmailGet<RawMessage>(token, `messages/${id}`, { format: "raw" });
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
  return parseMessage(message);
}

export async function parseMessage(message: RawMessage): Promise<ParsedEmail | null> {
  const labels = [...(message.labelIds ?? [])].sort();
  if (!message.raw || labels.some((label) => SKIP_LABELS.includes(label))) return null;
  const raw = Buffer.from(message.raw, "base64url");
  const mail = await PostalMime.parse(raw);
  const from = mailboxes(mail.from ? [mail.from] : [])[0];
  const body = mail.text?.trim() ? mail.text : htmlToText(mail.html ?? "");
  return {
    gmailId: message.id,
    threadId: message.threadId,
    fromName: clean(from?.name || from?.address || "").slice(0, 200),
    fromAddress: clean(from?.address ?? "").slice(0, 200),
    to: mailboxes([...(mail.to ?? []), ...(mail.cc ?? [])])
      .map((m) => (m.name ? `${m.name} <${m.address}>` : m.address))
      .join(", ")
      .slice(0, 1000),
    subject: clean(mail.subject ?? "").slice(0, 500) || "(no subject)",
    // Gmail's own time it arrived, which a sender can't set, unlike the Date header
    sentAt: new Date(Number(message.internalDate) || Date.parse(mail.date ?? "") || Date.now()),
    body: tidy(body).slice(0, BODY_LIMIT),
    attachments: mail.attachments
      .filter((a) => a.disposition === "attachment" || a.filename)
      .map((a) => ({
        filename: clean(a.filename ?? "").slice(0, 200),
        mimeType: a.mimeType,
        size: typeof a.content === "string" ? a.content.length : a.content.byteLength,
      })),
    labels,
    raw: raw.length <= RAW_LIMIT ? raw : null,
  };
}

// Groups ("Housemates: a@x, b@y;") flattened into their people
function mailboxes(addresses: Address[]) {
  return addresses.flatMap((a) => (a.group ? a.group : [a])).map((m) => ({ name: clean(m.name), address: clean(m.address) }));
}

// ---------- text ----------

// Control characters and invisible direction marks out, one line of whitespace
const clean = (s: string) => tidy(s).replace(/\s+/g, " ");

export function tidy(text: string) {
  return text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f​-‏‪-‮⁦-⁩﻿͏]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Mail that only has an HTML part, as text: hidden blocks, styles and scripts out, a line break at
// each block, then no tags at all. Rough, but nothing here is ever shown as HTML.
export function htmlToText(html: string) {
  return tidy(
    html
      .replace(/<(script|style|head|title|template|svg)\b[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|tr|table|h[1-6]|blockquote|ul|ol|section|header|footer)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
        if (name[0] === "#") {
          const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
          return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
        }
        return ENTITIES[name.toLowerCase()] ?? entity;
      }),
  );
}

// ---------- one sync ----------

export type Cursor = { historyId: string | null; backfillPageToken: string | null; backfillHistoryId: string | null };

export type SyncResult = {
  cursor: Cursor;
  messages: ParsedEmail[];
  deleted: string[];
  // New labels for messages already stored, by Gmail id
  relabelled: Map<string, string[]>;
};

type HistoryRecord = {
  id: string;
  messagesAdded?: { message: { id: string; labelIds?: string[] } }[];
  messagesDeleted?: { message: { id: string } }[];
  labelsAdded?: { message: { id: string; labelIds?: string[] } }[];
  labelsRemoved?: { message: { id: string; labelIds?: string[] } }[];
};

// Fetches what changed since the cursor. The cursor only moves past messages that are in the
// result, so a sync that stops at MAX_PER_SYNC, or fails, carries on from there next time.
export async function fetchChanges(token: string, cursor: Cursor): Promise<SyncResult> {
  if (!cursor.historyId || cursor.backfillPageToken) return backfill(token, cursor);
  try {
    return await fromHistory(token, cursor.historyId);
  } catch (error) {
    // Gmail keeps about a week of history. Older than that, start again from the last 30 days.
    if (error instanceof NotFound) return backfill(token, { historyId: null, backfillPageToken: null, backfillHistoryId: null });
    throw error;
  }
}

async function backfill(token: string, cursor: Cursor): Promise<SyncResult> {
  // History from before the first page covers mail that arrives while the backfill runs
  const start =
    cursor.backfillHistoryId ?? (await gmailGet<{ historyId: string }>(token, "profile")).historyId;
  let page = cursor.backfillPageToken;
  const messages: ParsedEmail[] = [];
  let listed = 0;
  do {
    const params: Record<string, string> = {
      q: `newer_than:${BACKFILL_DAYS}d -in:spam -in:trash -in:drafts`,
      maxResults: String(PAGE),
    };
    if (page) params.pageToken = page;
    const list = await gmailGet<{ messages?: { id: string }[]; nextPageToken?: string }>(token, "messages", params);
    const ids = (list.messages ?? []).map((m) => m.id);
    messages.push(...(await fetchAll(token, ids)));
    listed += ids.length;
    page = list.nextPageToken ?? null;
  } while (page && listed < MAX_PER_SYNC);
  return {
    cursor: page
      ? { historyId: null, backfillPageToken: page, backfillHistoryId: start }
      : { historyId: start, backfillPageToken: null, backfillHistoryId: null },
    messages,
    deleted: [],
    relabelled: new Map(),
  };
}

async function fromHistory(token: string, historyId: string): Promise<SyncResult> {
  const records: HistoryRecord[] = [];
  let latest = historyId;
  let page: string | undefined;
  do {
    const params: Record<string, string | string[]> = {
      startHistoryId: historyId,
      maxResults: "500",
      historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
    };
    if (page) params.pageToken = page;
    const res = await gmailGet<{ history?: HistoryRecord[]; historyId: string; nextPageToken?: string }>(
      token,
      "history",
      params,
    );
    records.push(...(res.history ?? []));
    latest = res.historyId ?? latest;
    page = res.nextPageToken;
  } while (page);

  const changes = historyChanges(records, latest);
  const messages = await fetchAll(token, changes.added);
  return {
    cursor: { historyId: changes.historyId, backfillPageToken: null, backfillHistoryId: null },
    messages,
    deleted: changes.deleted,
    relabelled: changes.relabelled,
  };
}

// What a run of history records means: messages to fetch, deleted ones and new labels. Stops after
// MAX_PER_SYNC new messages, at the end of a whole record, and says which history id to carry on from.
export function historyChanges(records: HistoryRecord[], latest: string) {
  const added: string[] = [];
  const deleted: string[] = [];
  const relabelled = new Map<string, string[]>();
  for (const [i, record] of records.entries()) {
    for (const { message } of record.messagesAdded ?? []) {
      if (added.includes(message.id) || message.labelIds?.some((l) => SKIP_LABELS.includes(l))) continue;
      added.push(message.id);
    }
    for (const { message } of record.messagesDeleted ?? []) deleted.push(message.id);
    for (const { message } of [...(record.labelsAdded ?? []), ...(record.labelsRemoved ?? [])]) {
      if (message.labelIds) relabelled.set(message.id, [...message.labelIds].sort());
    }
    if (added.length >= MAX_PER_SYNC && i < records.length - 1) {
      return { added, deleted, relabelled, historyId: record.id };
    }
  }
  return { added, deleted, relabelled, historyId: latest };
}

// Five at a time, to stay well inside Gmail's per-user rate limit
async function fetchAll(token: string, ids: string[]) {
  const results: ParsedEmail[] = [];
  for (let i = 0; i < ids.length; i += 5) {
    const batch = await Promise.all(ids.slice(i, i + 5).map((id) => fetchMessage(token, id)));
    results.push(...batch.filter((m): m is ParsedEmail => m !== null));
  }
  return results;
}
