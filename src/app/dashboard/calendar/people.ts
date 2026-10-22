import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, trips } from "@/db/schema";
import { knownPeople } from "@/lib/trips";

// Housemates' names from earlier trips and stays, for the forms' suggestions
export async function housemates() {
  const [tripPeople, stayPeople] = await Promise.all([
    db.selectDistinct({ person: trips.person }).from(trips),
    db.selectDistinct({ person: applications.addedBy }).from(applications).where(isNotNull(applications.addedBy)),
  ]);
  return knownPeople([...tripPeople, ...stayPeople].map((p) => p.person ?? ""));
}
