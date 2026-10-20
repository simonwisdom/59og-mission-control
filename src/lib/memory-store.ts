import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memories, type Memory } from "@/db/schema";
import { sameTitle, type MemoryInput } from "./memory";

// Saving and removing Grovelet's memory, for the Memory page and /api/bot/memory alike

export async function liveMemories() {
  return db.select().from(memories).where(isNull(memories.replacedAt)).orderBy(desc(memories.createdAt));
}

// Saves a note, or a document, which replaces the live document of the same name
export async function saveMemory(input: MemoryInput) {
  return db.transaction(async (tx) => {
    if (input.kind === "document") {
      const live = await tx
        .select()
        .from(memories)
        .where(and(eq(memories.kind, "document"), isNull(memories.replacedAt)));
      for (const old of live.filter((row) => sameTitle(row.title, input.title))) {
        await tx.update(memories).set({ replacedAt: new Date() }).where(eq(memories.id, old.id));
      }
    }
    const [row] = await tx.insert(memories).values(input).returning();
    return row;
  });
}

// Removes a note or document. Grovelet's undo brings back the document it replaced, if any, so
// undoing a new version leaves the house with the old one rather than none. Forget on the Memory
// page removes the document and every older version of it, so nothing comes back.
export async function removeMemory(row: Memory, how: "undo" | "forget") {
  await db.transaction(async (tx) => {
    await tx.delete(memories).where(eq(memories.id, row.id));
    if (row.kind !== "document" || row.replacedAt) return;
    if (how === "forget") {
      const older = await tx
        .select()
        .from(memories)
        .where(and(eq(memories.kind, "document"), isNotNull(memories.replacedAt)));
      for (const old of older.filter((o) => sameTitle(o.title, row.title))) {
        await tx.delete(memories).where(eq(memories.id, old.id));
      }
      return;
    }
    const replaced = await tx
      .select()
      .from(memories)
      .where(and(eq(memories.kind, "document"), isNotNull(memories.replacedAt)))
      .orderBy(desc(memories.replacedAt));
    const previous = replaced.find((old) => sameTitle(old.title, row.title));
    if (previous) await tx.update(memories).set({ replacedAt: null }).where(eq(memories.id, previous.id));
  });
}

export async function findMemory(id: number) {
  const [row] = Number.isInteger(id) ? await db.select().from(memories).where(eq(memories.id, id)) : [];
  return row;
}
