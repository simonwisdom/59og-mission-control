import { z } from "zod";
import type { Memory } from "@/db/schema";

// Grovelet's memory. The Memory page and Grovelet both send what they save through parseMemory, so
// the same limits hold however it comes in.

// A note is a sentence or two; a document about 20 pages
export const NOTE_LIMIT = 500;
export const DOCUMENT_LIMIT = 60_000;

export type MemoryInput = Pick<Memory, "kind" | "title" | "body" | "addedBy">;
export type MemoryErrors = Partial<Record<keyof MemoryInput, string>>;

// "the door code is 4471", "wifi password: olives22", "PIN 1234": a code or password with its value.
// Saying a code exists ("we give guests the door code on arrival") is fine.
const SECRET = /\b(pass ?word|passcode|pin|door code|alarm code|lock code|key ?safe code|sort code|account number|card number|iban)\b\W{0,3}(is\b|=)?\W{0,3}[^\s]*\d/i;

export function looksSecret(text: string) {
  return SECRET.test(text);
}

const memorySchema = z
  .object({
    kind: z.enum(["note", "document"], "Say whether it's a note or a document"),
    title: z
      .string()
      .trim()
      .max(80, "Keep the name under 80 characters")
      .optional()
      .nullable()
      .transform((value) => value || null),
    body: z.string("Write something to remember").trim().min(1, "Write something to remember"),
    addedBy: z
      .string()
      .trim()
      .max(40)
      .optional()
      .nullable()
      .transform((value) => value || null),
  })
  .refine((memory) => memory.kind === "note" || memory.title, { path: ["title"], message: "Give the document a name" })
  .refine((memory) => memory.body.length <= (memory.kind === "note" ? NOTE_LIMIT : DOCUMENT_LIMIT), {
    path: ["body"],
    message: "That's too long to remember",
  })
  .refine((memory) => !looksSecret(memory.body), {
    path: ["body"],
    message: "That looks like a code or password. Grovelet doesn't keep those, so keep it somewhere private",
  })
  .transform((memory) => ({ ...memory, title: memory.kind === "note" ? null : memory.title }));

export function parseMemory(input: Record<string, unknown>): { success: true; data: MemoryInput } | { success: false; errors: MemoryErrors } {
  const result = memorySchema.safeParse({
    kind: input.kind ?? undefined,
    title: input.title ?? undefined,
    body: input.body ?? undefined,
    addedBy: input.addedBy ?? undefined,
  });
  if (result.success) return { success: true, data: result.data };
  const errors: MemoryErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof MemoryInput] ??= issue.message;
  return { success: false, errors };
}

export function sameTitle(a: string | null, b: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export type BotMemory = {
  notes: { id: number; text: string; addedBy: string | null; date: string }[];
  documents: { id: number; title: string; text: string; addedBy: string | null; date: string }[];
};

// What Grovelet reads: every live note and document, oldest first, with who added it and when
export function botMemory(rows: Memory[]): BotMemory {
  const live = rows.filter((row) => !row.replacedAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const date = (row: Memory) => row.createdAt.toISOString().slice(0, 10);
  return {
    notes: live.filter((row) => row.kind === "note").map((row) => ({ id: row.id, text: row.body, addedBy: row.addedBy, date: date(row) })),
    documents: live
      .filter((row) => row.kind === "document")
      .map((row) => ({ id: row.id, title: row.title ?? "Untitled", text: row.body, addedBy: row.addedBy, date: date(row) })),
  };
}
