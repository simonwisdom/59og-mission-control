"use server";

import { revalidatePath } from "next/cache";
import { requireSession, sessionName } from "@/lib/auth";
import { parseMemory, type MemoryErrors } from "@/lib/memory";
import { findMemory, removeMemory, saveMemory } from "@/lib/memory-store";

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

// Any housemate can remove anything here, like everything else on the dashboard
export async function deleteMemory(id: number) {
  await requireSession();
  const row = await findMemory(id);
  if (row) await removeMemory(row, "forget");
  revalidatePath("/dashboard", "layout");
}
