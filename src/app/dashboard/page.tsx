import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, count, eq, gt, gte, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { applications, memories, trips } from "@/db/schema";
import { getHouseFinances, isActualConfigured, type RegularPayment } from "@/lib/actual";
import { isGmailConfigured } from "@/lib/gmail";
import { getMailbox, recentEmails } from "@/lib/house-mail";
import { formatDate, formatPence } from "@/lib/format";
import { weeksFrom } from "@/lib/guest-calendar";
import { getBinCollections, type Collection } from "@/lib/hackney-bins";
import { getEnergyUsage, type DailyUsage } from "@/lib/octopus";
import { StayLegend, StayWeeks } from "./calendar/stay-weeks";
import { MiniUsage } from "./energy/mini-usage";
import { HousePages } from "./pages/house-pages";
import { PhoneSetup } from "./phone-setup";
import { UsefulLinks } from "./useful-links";

export const metadata: Metadata = { title: "Dashboard" };

// Guest and bin dates are London calendar days, so compare against today's date there
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const dayAndDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const BINS_PAGE = "https://www.hackney.gov.uk/rubbish-and-recycling/rubbish-recycling-and-food-waste-collections/check-your-collection-day";
const DAY_MS = 86_400_000;
// This week and the four after it
const CALENDAR_WEEKS = 5;

// ["Recycling", "Food waste", "Rubbish"] → "recycling, food waste and rubbish"
function binList(bins: string[]) {
  const names = bins.map((bin) => bin.toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

// Bins go out the night before collection
function binTask(next: Collection, after: Collection | undefined, today: string) {
  const days = (Date.parse(next.date) - Date.parse(today)) / DAY_MS;
  const bins = binList(next.bins);
  const task =
    days === 0
      ? `The ${bins} get collected today`
      : days === 1
        ? `Put the ${bins} out tonight`
        : `Put the ${bins} out on ${weekday.format(new Date(Date.parse(next.date) - DAY_MS))} night`;
  const then = after && `Then ${dayAndDate.format(new Date(`${after.date}T00:00:00Z`))}: ${binList(after.bins)}.`;
  return { task, then };
}

// The meter reports a day or so late, so the newest day can be partly read; show only full days
const fullWeek = (days: DailyUsage[] | null) => (days ?? []).filter((day) => day.readings >= 46).slice(-7);

// Hackney, Octopus and Actual can take a few seconds when their cache is cold, so these stream in
// after the rest of the page

async function BinDay({ today }: { today: string }) {
  const bins = await getBinCollections(today);
  const [nextBins, afterBins] = bins.status === "ok" ? bins.collections : [];
  if (!nextBins) {
    return (
      <a href={BINS_PAGE} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-pillar">
        Check bin day on Hackney&apos;s site ↗
      </a>
    );
  }
  const bin = binTask(nextBins, afterBins, today);
  return (
    <>
      <p className="font-medium">{bin.task}</p>
      {bin.then && <p className="text-sm text-muted">{bin.then}</p>}
    </>
  );
}

async function MoneySummary() {
  const money = await getHouseFinances();
  if (money.status !== "ok") {
    return <p className="mt-1 text-sm text-muted">Balance and spending from the house budget in Actual</p>;
  }
  const balance = money.accounts.reduce((sum, account) => sum + account.balance, 0);
  return (
    <div className="mt-1">
      <p>
        <span className="text-lg font-medium tabular-nums">{formatPence(balance)}</span>{" "}
        <span className="text-muted">in the house account{money.accounts.length > 1 && "s"}</span>
      </p>
      {(money.shares.length > 0 || money.bills.length > 0) && (
        <p className="text-sm text-muted">
          {checked(money.shares, "shares paid")} · {checked(money.bills, "bills gone out")}
        </p>
      )}
    </div>
  );
}

// "2 documents and 5 notes"
function memoryCount(rows: { kind: string }[]) {
  const documents = rows.filter((row) => row.kind === "document").length;
  const notes = rows.length - documents;
  if (rows.length === 0) return "Notes and documents housemates give Grovelet, such as the guest policy";
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [documents && plural(documents, "document"), notes && plural(notes, "note")].filter(Boolean).join(" and ");
}

// "3 of 4 shares paid"
const checked = (payments: RegularPayment[], what: string) =>
  `${payments.filter((p) => p.status === "paid").length} of ${payments.length} ${what}`;

// What's stored; the Email page itself checks Gmail for new mail
async function MailSummary() {
  const mailbox = await getMailbox();
  if (!mailbox) return <p className="mt-1 text-sm text-muted">Connect the house Gmail to read it here</p>;
  const [latest] = await recentEmails(1);
  return (
    <p className="mt-1 truncate text-sm text-muted">
      {latest ? (
        <>
          Latest: <span className="text-foreground">{latest.fromName}</span>, {latest.subject}
        </>
      ) : (
        mailbox.address
      )}
    </p>
  );
}

async function EnergyWeek() {
  // Two days more than shown, so partly read days at either end can be dropped
  const energy = await getEnergyUsage(9);
  const electricity = energy.status === "ok" ? fullWeek(energy.electricity) : [];
  const gas = energy.status === "ok" ? fullWeek(energy.gas) : [];
  if (electricity.length === 0 && gas.length === 0) {
    return <p className="mt-1 text-sm text-muted">Daily electricity and gas use from the smart meters</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
      <MiniUsage title="electricity" days={electricity} />
      <MiniUsage title="gas" days={gas} />
    </div>
  );
}

export default async function DashboardHome() {
  const today = londonToday();
  const weeks = weeksFrom(today, CALENDAR_WEEKS);
  const [firstDay, lastDay] = [weeks[0][0], weeks.at(-1)!.at(-1)!];
  const stayFields = {
    id: applications.id,
    name: applications.name,
    partySize: applications.partySize,
    arrivalDate: applications.arrivalDate,
    departureDate: applications.departureDate,
    status: applications.status,
  };
  const [[{ pending }], stays, [later], weekTrips, remembered] = await Promise.all([
    db.select({ pending: count() }).from(applications).where(eq(applications.status, "pending")),
    db
      .select(stayFields)
      .from(applications)
      .where(
        and(
          ne(applications.status, "declined"),
          lte(applications.arrivalDate, lastDay),
          gte(applications.departureDate, firstDay),
        ),
      )
      .orderBy(asc(applications.arrivalDate)),
    // The first confirmed guest after the weeks shown, so a quiet stretch still says who's next
    db
      .select(stayFields)
      .from(applications)
      .where(and(eq(applications.status, "approved"), gt(applications.arrivalDate, lastDay)))
      .orderBy(asc(applications.arrivalDate))
      .limit(1),
    db
      .select()
      .from(trips)
      .where(and(lte(trips.leaveDate, lastDay), gte(trips.backDate, firstDay)))
      .orderBy(asc(trips.leaveDate)),
    db.select({ kind: memories.kind }).from(memories).where(isNull(memories.replacedAt)),
  ]);

  return (
    <>
      <h1 className="section-title mb-5">House services</h1>
      {/* Short cards stacked on the left and the tall calendar on the right, so the columns come out
          close in height and no card is stretched to fill */}
      <div className="grid items-start gap-3 md:grid-cols-2">
        <div className="grid gap-3">
          <section className="card border-2 border-ink/80">
            <h2 className="hand text-xl">Coming up</h2>
            <ul className="mt-2 divide-y divide-line">
              <li className="py-3">
                <Suspense fallback={<p className="text-muted">Checking bin day…</p>}>
                  <BinDay today={today} />
                </Suspense>
              </li>
              {pending > 0 && (
                <li className="py-3">
                  <Link href="/dashboard/applications" className="font-medium hover:text-pillar">
                    {pending === 1 ? "A guest application" : `${pending} guest applications`} to look at
                  </Link>
                </li>
              )}
            </ul>
          </section>
          <Link href="/dashboard/energy" className="card block hover:border-tile">
            <h2 className="hand text-lg">Energy, last 7 days</h2>
            <Suspense fallback={<p className="mt-1 text-sm text-muted">Reading the meters…</p>}>
              <EnergyWeek />
            </Suspense>
          </Link>
          {isGmailConfigured() && (
            <Link href="/dashboard/email" className="card block hover:border-tile">
              <h2 className="hand text-lg">Email</h2>
              <Suspense fallback={<p className="mt-1 text-sm text-muted">Opening the post…</p>}>
                <MailSummary />
              </Suspense>
            </Link>
          )}
          <Link href="/dashboard/memory" className="card block hover:border-tile">
            <h2 className="hand text-lg">Grovelet&apos;s memory</h2>
            <p className="mt-1 text-sm text-muted">{memoryCount(remembered)}</p>
          </Link>
          {isActualConfigured() && (
            <Link href="/dashboard/money" className="card block hover:border-tile">
              <h2 className="hand text-lg">House money</h2>
              <Suspense fallback={<p className="mt-1 text-sm text-muted">Opening the books…</p>}>
                <MoneySummary />
              </Suspense>
            </Link>
          )}
        </div>

        <section className="card">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="hand text-lg">Calendar</h2>
            <Link href="/dashboard/calendar" className="text-sm text-muted hover:text-pillar">
              Full calendar →
            </Link>
          </div>
          <StayWeeks weeks={weeks} stays={stays} trips={weekTrips} today={today} compact />
          <StayLegend className="mt-2 text-xs" />
          {later && (
            <p className="mt-2 text-sm text-muted">
              After that:{" "}
              <Link href={`/dashboard/applications/${later.id}`} className="font-medium text-foreground hover:text-pillar">
                {later.name}
              </Link>
              , {formatDate(later.arrivalDate)}
            </p>
          )}
        </section>
      </div>
      <HousePages />
      <UsefulLinks />
      <PhoneSetup />
    </>
  );
}
