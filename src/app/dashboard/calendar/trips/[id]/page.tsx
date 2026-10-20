import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { knownPeople } from "@/lib/trips";
import { Crumbs } from "../../../crumbs";
import { TripForm } from "../../trip-form";
import { DeleteTripButton } from "./delete-trip-button";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [[trip], people] = await Promise.all([
    db.select().from(trips).where(eq(trips.id, id)),
    db.selectDistinct({ person: trips.person }).from(trips),
  ]);
  if (!trip) notFound();

  return (
    <>
      <Crumbs trail={[{ label: "Calendar", href: `/dashboard/calendar?month=${trip.leaveDate.slice(0, 7)}` }]} />
      <h1 className="hand text-2xl">{trip.person}&apos;s trip</h1>
      <p className="mt-1 text-sm text-muted">
        Last changed {formatDate(trip.updatedAt)}
        {trip.updatedBy && ` by ${trip.updatedBy}`}
      </p>
      <section className="card mt-5">
        <TripForm trip={trip} people={knownPeople(people.map((p) => p.person))} />
      </section>
      <div className="mt-4">
        <DeleteTripButton tripId={trip.id} />
      </div>
    </>
  );
}
