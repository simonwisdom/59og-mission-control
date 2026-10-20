import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { emails, houseMailbox } from "@/db/schema";
import { GmailError, accessToken, fetchChanges, isGmailConfigured } from "./gmail";

// Syncs the house Gmail into the emails table when someone looks: at most every 10 minutes, or
// straight away while the first 30 days are still coming in. One sync at a time per server.
const SYNC_EVERY_MS = 10 * 60 * 1000;
let inFlight: Promise<void> | null = null;

export async function getMailbox() {
  const [row] = await db.select().from(houseMailbox).limit(1);
  return row ?? null;
}

export function syncHouseMail(): Promise<void> {
  inFlight ??= runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// For callers that can't wait for a long first sync (Grovelet's feed): what's stored after `ms`.
// The sync carries on in the background.
export function syncHouseMailWithin(ms: number) {
  return Promise.race([syncHouseMail(), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

async function runSync() {
  const box = await getMailbox();
  if (!box || !isGmailConfigured()) return;
  // A failing sync waits its 10 minutes too, so a broken login doesn't call Google on every page view
  const backfilling = (!box.historyId || box.backfillPageToken !== null) && !box.lastError;
  if (!backfilling && box.lastSyncAt && Date.now() - box.lastSyncAt.getTime() < SYNC_EVERY_MS) return;

  try {
    const result = await fetchChanges(await accessToken(box.refreshToken), box);
    await db.transaction(async (tx) => {
      for (const message of result.messages) {
        await tx
          .insert(emails)
          .values(message)
          .onConflictDoUpdate({ target: emails.gmailId, set: { ...message, deleted: false } });
      }
      if (result.deleted.length > 0) {
        await tx.update(emails).set({ deleted: true }).where(inArray(emails.gmailId, result.deleted));
      }
      for (const [gmailId, labels] of result.relabelled) {
        await tx.update(emails).set({ labels }).where(eq(emails.gmailId, gmailId));
      }
      await tx
        .update(houseMailbox)
        .set({ ...result.cursor, lastSyncAt: new Date(), lastError: null })
        .where(eq(houseMailbox.id, box.id));
    });
  } catch (error) {
    console.error("House Gmail sync failed", error);
    const message = error instanceof GmailError ? error.message : "Couldn't reach Gmail";
    await db.update(houseMailbox).set({ lastSyncAt: new Date(), lastError: message }).where(eq(houseMailbox.id, box.id));
  }
}

// Newest first, leaving out deleted ones
export async function recentEmails(limit: number, since?: Date) {
  return db
    .select({
      id: emails.id,
      fromName: emails.fromName,
      fromAddress: emails.fromAddress,
      to: emails.to,
      subject: emails.subject,
      sentAt: emails.sentAt,
      body: emails.body,
      attachments: emails.attachments,
      labels: emails.labels,
    })
    .from(emails)
    .where(and(eq(emails.deleted, false), since ? gte(emails.sentAt, since) : undefined))
    .orderBy(desc(emails.sentAt))
    .limit(limit);
}
