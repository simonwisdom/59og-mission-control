import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Crumbs } from "../../../crumbs";
import { StayForm } from "../../stay-form";
import { housemates } from "../../people";
import { DeleteStayButton } from "./delete-stay-button";

export const metadata: Metadata = { title: "Guest stay" };

export default async function StayPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [[stay], people] = await Promise.all([db.select().from(applications).where(eq(applications.id, id)), housemates()]);
  if (!stay) notFound();
  // An application has its own page
  if (!stay.addedBy) redirect(`/dashboard/applications/${stay.id}`);

  return (
    <>
      <Crumbs trail={[{ label: "Calendar", href: `/dashboard/calendar?month=${stay.arrivalDate.slice(0, 7)}` }]} />
      <h1 className="hand text-2xl">{stay.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {stay.addedBy}&apos;s guest, added {formatDate(stay.createdAt)}
      </p>
      <section className="card mt-5">
        <StayForm stay={{ ...stay, addedBy: stay.addedBy }} people={people} />
      </section>
      <div className="mt-4">
        <DeleteStayButton stayId={stay.id} />
      </div>
    </>
  );
}
