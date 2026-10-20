import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { memories, type Memory } from "@/db/schema";
import { chainOf, isLive, sameTitle, type MemoryInput } from "./memory";

// Saving, replacing, forgetting and bringing back Grovelet's memory, for the Memory page and
// /api/bot/memory alike. Nothing here deletes a row except deleteForGood.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const live = and(isNull(memories.replacedAt), isNull(memories.removedAt));

export async function liveMemories() {
  return db.select().from(memories).where(live).orderBy(desc(memories.createdAt));
}

export async function allMemories() {
  return db.select().from(memories).orderBy(desc(memories.createdAt));
}

async function chainRows(tx: Tx, chain: number) {
  return tx
    .select()
    .from(memories)
    .where(or(eq(memories.id, chain), eq(memories.chainId, chain)));
}

// Saves a note or document as a new version of `old` when given, which it replaces. A document
// also replaces the live document of the same name. `replacesId` is a live note a correction or
// edit replaces; anything else there is ignored.
export async function saveMemory(input: MemoryInput, replacesId?: number) {
  return db.transaction(async (tx) => {
    const current = await tx.select().from(memories).where(and(live, eq(memories.kind, input.kind)));
    const old =
      input.kind === "document"
        ? current.find((row) => sameTitle(row.title, input.title))
        : current.find((row) => row.id === replacesId);
    if (old) {
      await tx.update(memories).set({ replacedAt: new Date(), replacedBy: input.addedBy }).where(eq(memories.id, old.id));
    }
    const [row] = await tx
      .insert(memories)
      .values({ ...input, chainId: old ? chainOf(old) : null })
      .returning();
    return row;
  });
}

// Forget on the Memory page: hides it from Grovelet and lists it in History
export async function forgetMemory(row: Memory, by: string | null) {
  await db.update(memories).set({ removedAt: new Date(), removedBy: by }).where(eq(memories.id, row.id));
}

// Grovelet's undo: hides what was just saved and brings back the version it replaced, if any, so
// undoing a new version leaves the house with the old one rather than none
export async function undoMemory(row: Memory, by: string) {
  await db.transaction(async (tx) => {
    await tx.update(memories).set({ removedAt: new Date(), removedBy: by }).where(eq(memories.id, row.id));
    const previous = (await chainRows(tx, chainOf(row)))
      .filter((old) => old.id !== row.id && old.replacedAt && !old.removedAt)
      .sort((a, b) => b.replacedAt!.getTime() - a.replacedAt!.getTime())[0];
    if (previous) await tx.update(memories).set({ replacedAt: null, replacedBy: null }).where(eq(memories.id, previous.id));
  });
}

// Bring back from History: this version becomes the live one again, replacing whichever version
// of the same note or document is live now
export async function bringBack(row: Memory, by: string | null) {
  await db.transaction(async (tx) => {
    for (const other of (await chainRows(tx, chainOf(row))).filter((o) => o.id !== row.id && isLive(o))) {
      await tx.update(memories).set({ replacedAt: new Date(), replacedBy: by }).where(eq(memories.id, other.id));
    }
    // A document could also clash with a live one of the same name that started its own chain
    if (row.kind === "document") {
      const named = await tx.select().from(memories).where(and(live, eq(memories.kind, "document")));
      for (const other of named.filter((o) => o.id !== row.id && sameTitle(o.title, row.title))) {
        await tx.update(memories).set({ replacedAt: new Date(), replacedBy: by }).where(eq(memories.id, other.id));
      }
    }
    await tx
      .update(memories)
      .set({ replacedAt: null, replacedBy: null, removedAt: null, removedBy: null })
      .where(eq(memories.id, row.id));
  });
}

// Delete for good, from History only: for something that shouldn't be kept at all
export async function deleteForGood(row: Memory) {
  await db.delete(memories).where(eq(memories.id, row.id));
}

export async function findMemory(id: number) {
  const [row] = Number.isInteger(id) ? await db.select().from(memories).where(eq(memories.id, id)) : [];
  return row;
}
