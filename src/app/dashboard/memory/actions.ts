"use server";

import { revalidatePath } from "next/cache";
import { requireSession, sessionName } from "@/lib/auth";
import { isLive, parseMemory, type MemoryErrors } from "@/lib/memory";
import { bringBack, deleteForGood, findMemory, forgetMemory, saveMemory } from "@/lib/memory-store";

export type MemoryFormState = { errors: MemoryErrors } | { saved: true } | undefined;

// Adds a note or a document from the Memory page. A document with the name of one Grovelet already
// has replaces it, as it does from the chat.
export async function addMemory(kind: "note" | "document", _prev: MemoryFormState, formData: FormData): Promise<MemoryFormState> {
  await requireSession();
  const parsed = parseMemory({ ...Object.fromEntries(formData), kind, addedBy: await sessionName() });
  if (!parsed.success) return { errors: parsed.errors };
  await saveMemory(parsed.data);
  revalidatePath("/dashboard", "layout");
  return { saved: true };
}

// Changes a note's words. The old wording goes to History.
export async function editNote(id: number, _prev: MemoryFormState, formData: FormData): Promise<MemoryFormState> {
  await requireSession();
  const row = await findMemory(id);
  if (!row || row.kind !== "note" || !isLive(row)) return { errors: { body: "That note has changed. Reload the page." } };
  const parsed = parseMemory({ kind: "note", body: formData.get("body"), addedBy: await sessionName() });
  if (!parsed.success) return { errors: parsed.errors };
  await saveMemory(parsed.data, row.id);
  revalidatePath("/dashboard", "layout");
  return { saved: true };
}

// Any housemate can forget, bring back or delete anything here, like everything else on the dashboard

export async function forget(id: number) {
  await requireSession();
  const row = await findMemory(id);
  if (row && isLive(row)) await forgetMemory(row, await sessionName());
  revalidatePath("/dashboard", "layout");
}

export async function restore(id: number) {
  await requireSession();
  const row = await findMemory(id);
  if (row && !isLive(row)) await bringBack(row, await sessionName());
  revalidatePath("/dashboard", "layout");
}

export async function deleteMemory(id: number) {
  await requireSession();
  const row = await findMemory(id);
  if (row && !isLive(row)) await deleteForGood(row);
  revalidatePath("/dashboard", "layout");
}
