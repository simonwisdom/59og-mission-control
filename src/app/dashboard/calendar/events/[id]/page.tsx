import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Crumbs } from "../../../crumbs";
import { EventForm } from "../../event-form";
import { housemates } from "../../people";
import { DeleteEventButton } from "./delete-event-button";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [[event], people] = await Promise.all([db.select().from(events).where(eq(events.id, id)), housemates()]);
  if (!event) notFound();

  return (
    <>
      <Crumbs trail={[{ label: "Calendar", href: `/dashboard/calendar?month=${event.date.slice(0, 7)}` }]} />
      <h1 className="hand text-2xl">{event.title}</h1>
      <p className="mt-1 text-sm text-muted">
        Added by {event.addedBy}, last changed {formatDate(event.updatedAt)}
        {event.updatedBy && ` by ${event.updatedBy}`}
      </p>
      {event.link && (
        <p className="mt-2 text-sm">
          <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-pillar hover:underline">
            Open the event&apos;s link ↗
          </a>
        </p>
      )}
      <section className="card mt-5">
        <EventForm event={event} people={people} />
      </section>
      <div className="mt-4">
        <DeleteEventButton eventId={event.id} />
      </div>
    </>
  );
}
