import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { bookedNights } from "@/lib/guest-calendar";

export const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

// Nights from today on that a confirmed guest has. Requested stays don't block anyone until a
// housemate approves them.
export async function upcomingBookedNights() {
  const today = londonToday();
  const stays = await db
    .select({ arrivalDate: applications.arrivalDate, departureDate: applications.departureDate })
    .from(applications)
    .where(and(eq(applications.status, "approved"), gte(applications.departureDate, today)));
  return bookedNights(stays).filter((night) => night >= today);
}
