"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, trips } from "@/db/schema";
import { requireSession, sessionName } from "@/lib/auth";
import { parseStay, stayRow, type StayErrors } from "@/lib/stays";
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

export type StayFormState = { errors: StayErrors } | undefined;

// Adds a housemate's own guest, confirmed, or changes one when stayId is given. Like trips, any
// housemate can change any of these on the dashboard.
export async function saveStay(stayId: number | null, _prev: StayFormState, formData: FormData): Promise<StayFormState> {
  await requireSession();
  const parsed = parseStay(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.errors };

  if (stayId === null) {
    await db.insert(applications).values(stayRow(parsed.data));
  } else {
    await db
      .update(applications)
      .set(parsed.data)
      .where(and(eq(applications.id, stayId), isNotNull(applications.addedBy)));
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/calendar?month=${parsed.data.arrivalDate.slice(0, 7)}`);
}

// Only a housemate's stay: an application is deleted from its own page
export async function deleteStay(stayId: number) {
  await requireSession();
  await db.delete(applications).where(and(eq(applications.id, stayId), isNotNull(applications.addedBy)));
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/calendar");
}
