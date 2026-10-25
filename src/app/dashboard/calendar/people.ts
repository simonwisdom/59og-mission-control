import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, events, trips } from "@/db/schema";
import { knownPeople } from "@/lib/trips";

// Housemates' names from earlier trips, stays and events, for the forms' suggestions
export async function housemates() {
  const [tripPeople, stayPeople, eventPeople] = await Promise.all([
    db.selectDistinct({ person: trips.person }).from(trips),
    db.selectDistinct({ person: applications.addedBy }).from(applications).where(isNotNull(applications.addedBy)),
    db.selectDistinct({ person: events.addedBy }).from(events),
  ]);
  return knownPeople([...tripPeople, ...stayPeople, ...eventPeople].map((p) => p.person ?? ""));
}
