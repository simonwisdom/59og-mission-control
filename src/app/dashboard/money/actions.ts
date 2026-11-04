"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { housemates, paymentRules } from "@/db/schema";
import { requireSession, sessionName } from "@/lib/auth";
import { normaliseReference, parsePounds } from "@/lib/rent";

const refresh = () => revalidatePath("/dashboard", "layout");

export type HousemateFormState = { error: string } | { saved: true } | undefined;

// Adds a housemate, or changes one when housemateId is given
export async function saveHousemate(
  housemateId: number | null,
  _prev: HousemateFormState,
  formData: FormData,
): Promise<HousemateFormState> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const rent = parsePounds(String(formData.get("rent") ?? ""));
  const bills = parsePounds(String(formData.get("bills") ?? "") || "0");
  if (!name) return { error: "Add a name." };
  if (rent === null) return { error: "Rent should be an amount in pounds, like 806.18." };
  if (bills === null) return { error: "Bills should be an amount in pounds, like 181, or empty." };

  const updatedBy = await sessionName();
  if (housemateId === null) {
    await db.insert(housemates).values({ name, rent, bills, updatedBy });
  } else {
    await db
      .update(housemates)
      .set({ name, rent, bills, updatedBy, updatedAt: new Date() })
      .where(eq(housemates.id, housemateId));
  }
  refresh();
  return { saved: true };
}

// Takes a housemate off, with the references that were theirs
export async function deleteHousemate(housemateId: number) {
  await requireSession();
  await db.delete(housemates).where(eq(housemates.id, housemateId));
  refresh();
}

// From "Who's this?": says a payment's reference belongs to a housemate ("12"), or is nobody's
// rent or bills ("none"), so this and later payments with it match
export async function matchReference(reference: string, formData: FormData) {
  await requireSession();
  const normalised = normaliseReference(reference);
  const choice = String(formData.get("housemate") ?? "");
  if (!normalised || !choice) return;
  const housemateId = choice === "none" ? null : Number(choice);
  if (housemateId !== null && !Number.isInteger(housemateId)) return;

  const same = and(
    eq(paymentRules.reference, normalised),
    housemateId === null ? isNull(paymentRules.housemateId) : eq(paymentRules.housemateId, housemateId),
  );
  const [existing] = await db.select({ id: paymentRules.id }).from(paymentRules).where(same);
  if (!existing) {
    await db.insert(paymentRules).values({ reference: normalised, housemateId, addedBy: await sessionName() });
  }
  refresh();
}

// Forgets one reference, so its payments go back to "Who's this?"
export async function deleteReference(ruleId: number) {
  await requireSession();
  await db.delete(paymentRules).where(eq(paymentRules.id, ruleId));
  refresh();
}
