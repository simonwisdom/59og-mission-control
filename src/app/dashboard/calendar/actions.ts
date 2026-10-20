"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { requireSession, sessionName } from "@/lib/auth";
import { parseTrip, type TripErrors } from "@/lib/trips";

export type TripFormState = { errors: TripErrors } | undefined;

// Adds a trip, or changes one when tripId is given. Any housemate can change any trip, like
// everything else on the dashboard.
export async function saveTrip(tripId: number | null, _prev: TripFormState, formData: FormData): Promise<TripFormState> {
  await requireSession();
  const parsed = parseTrip(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.errors };

  const updatedBy = await sessionName();
  if (tripId === null) {
    await db.insert(trips).values({ ...parsed.data, updatedBy });
  } else {
    await db.update(trips).set({ ...parsed.data, updatedBy, updatedAt: new Date() }).where(eq(trips.id, tripId));
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/calendar?month=${parsed.data.leaveDate.slice(0, 7)}`);
}

export async function deleteTrip(tripId: number) {
  await requireSession();
  await db.delete(trips).where(eq(trips.id, tripId));
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/calendar");
}
