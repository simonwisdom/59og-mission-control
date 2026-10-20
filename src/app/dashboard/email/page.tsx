import type { Metadata } from "next";
import Link from "next/link";
import { BACKFILL_DAYS, isGmailConfigured, redirectUri } from "@/lib/gmail";
import { getMailbox, recentEmails, syncHouseMailWithin } from "@/lib/house-mail";
import { Crumbs } from "../crumbs";
import { connectGmail, disconnectGmail } from "./actions";

export const metadata: Metadata = { title: "Email" };

const LIST_COUNT = 50;
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

const ERRORS: Record<string, string> = {
  expired: "The sign-in took too long or was started elsewhere. Try again.",
  refused: "Google didn't give access. Try again, and allow reading the mail.",
  google: "Google didn't hand over access. Try again, and allow reading the mail.",
  failed: "Something went wrong connecting the account. Try again.",
};

export default async function EmailPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!isGmailConfigured()) {
    return (
      <>
        <Crumbs />
        <h1 className="hand mb-6 text-2xl">Email</h1>
        <p className="card text-sm text-muted">
          To read the house Gmail here, set <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code> and{" "}
          <code>APP_URL</code> on Railway. The README says how to make the client in Google Cloud.
        </p>
      </>
    );
  }

  // The first sync can take a minute; show what's in so far rather than wait for all of it
  await syncHouseMailWithin(8000);
  const [mailbox, rows] = await Promise.all([getMailbox(), recentEmails(LIST_COUNT)]);

  return (
    <>
      <Crumbs />
      <h1 className="hand mb-2 text-2xl">Email</h1>
      {error && ERRORS[error] && <p className="card mb-4 text-sm text-danger">{ERRORS[error]}</p>}

      {mailbox ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">
            The house Gmail, <span className="text-foreground">{mailbox.address}</span>, read-only.{" "}
            {mailbox.lastError
              ? null
              : mailbox.lastSyncAt && `Checked at ${time.format(mailbox.lastSyncAt)}; checked again every 10 minutes.`}
          </p>
          <form action={disconnectGmail}>
            <button type="submit" className="btn-secondary">
              Disconnect
            </button>
          </form>
          {mailbox.lastError && <p className="w-full text-sm text-danger">{mailbox.lastError}</p>}
        </div>
      ) : (
        <div className="card mb-6 max-w-2xl">
          <p className="text-muted">
            Connect the house Gmail to see its mail here and let Grovelet answer questions about it. You&apos;ll sign in
            to Google as the house account and allow reading only: nothing here can send, delete or archive mail. The
            last {BACKFILL_DAYS} days come in first.
          </p>
          <form action={connectGmail} className="mt-3">
            <button type="submit" className="btn-primary">
              Connect the house Gmail
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">Google sends you back to {redirectUri()}</p>
        </div>
      )}

      {mailbox && rows.length === 0 && (
        <p className="card text-muted">
          {mailbox.historyId ? `No mail in the last ${BACKFILL_DAYS} days.` : `Fetching the last ${BACKFILL_DAYS} days. Reload in a minute.`}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="card divide-y divide-line py-1">
          {rows.map((email) => (
            <li key={email.id}>
              <Link href={`/dashboard/email/${email.id}`} className="flex items-baseline justify-between gap-3 py-2.5 hover:text-pillar">
                <div className="min-w-0">
                  <p className={`truncate ${email.labels.includes("UNREAD") ? "font-medium" : ""}`}>
                    {email.labels.includes("SENT") ? `To ${email.to}` : email.fromName}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {email.subject}
                    {email.attachments.length > 0 && " · 📎"}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted">{when.format(email.sentAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
