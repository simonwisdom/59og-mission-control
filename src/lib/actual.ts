// Reads the house money from Actual Budget (https://actualbudget.org): balances, who has paid their
// share and which bills have gone out this month, money in and out, spending by category and
// recent transactions.
// Actual has no web API; its official Node client (@actual-app/api) logs in to the house's Actual
// server, downloads a copy of the budget to a temp folder and reads it there.
// Docs: https://actualbudget.org/docs/api/
// Needs ACTUAL_SERVER_URL, ACTUAL_PASSWORD (the server's login password) and ACTUAL_SYNC_ID (in Actual
// under Settings > Show advanced settings > Sync ID). ACTUAL_ENCRYPTION_PASSWORD only if the budget
// has end-to-end encryption on, and ACTUAL_ACCOUNTS to show only some accounts.
import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

// Amounts are whole pence, as Actual stores them: -1234 is £12.34 out
export type FinanceAccount = { name: string; balance: number };
export type FinanceTransaction = {
  id: string;
  date: string;
  account: string;
  payee: string;
  category: string | null;
  notes: string | null;
  amount: number;
};
export type CategorySpend = { category: string; amount: number };

// A payment that comes every month: a housemate's share in, or a bill out. Learned from the last
// few months rather than set up anywhere.
export type RegularPayment = {
  payee: string;
  // What last month's payment came to, as positive pence
  expected: number;
  // The day of the month it usually comes, e.g. 3
  usualDay: number;
  // Paid so far this month, as positive pence, and the date of the latest payment
  paid: number;
  lastPaidOn: string | null;
  status: "paid" | "part-paid" | "due" | "late";
  // Days past the usual day, when late or part-paid
  daysLate: number;
};

export type HouseFinances =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      accounts: FinanceAccount[];
      // "2026-10": the London month the totals below cover
      month: string;
      moneyIn: number;
      moneyOut: number;
      // Spending this month, biggest first, as positive pence
      spending: CategorySpend[];
      // Housemates' shares coming in and bills going out this month, in order of their usual day
      shares: RegularPayment[];
      bills: RegularPayment[];
      // Newest first
      recent: FinanceTransaction[];
    };

// The parts of Actual's records this page uses
export type ActualAccount = { id: string; name: string; closed?: boolean; offbudget?: boolean };
export type ActualTransaction = {
  id: string;
  account: string;
  date: string;
  amount: number;
  payee?: string | null;
  category?: string | null;
  notes?: string | null;
  transfer_id?: string | null;
  starting_balance_flag?: boolean;
  subtransactions?: ActualTransaction[];
};
export type ActualData = {
  accounts: ActualAccount[];
  balances: Record<string, number>;
  transactions: ActualTransaction[];
  payees: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};

const RECENT_COUNT = 15;
// Regular payments are learned from this many whole months before the current one
const HISTORY_MONTHS = 3;
// A payment counts as regular when it came in at least this many of those months
const REGULAR_IN = 2;
// Days after the usual day before a payment shows as late, for weekends and bank delays
const GRACE_DAYS = 3;
// A share counts as paid when it's within this much of the expected amount, in pence
const SHARE_TOLERANCE = 100;

// "2026-10" and 2 → "2026-08"
export function monthsBefore(month: string, count: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 - count, 1));
  return date.toISOString().slice(0, 7);
}

const daysIn = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

// Finds the payees that pay in (direction "in") or get paid (direction "out") every month, and how
// this month is going for each. Shares can be split over several payments, so they're summed and
// compared with last month's total. Bills must be one payment a month, which keeps out shops visited
// several times a month; their amounts vary, so any payment this month counts as paid.
export function regularPayments(
  transactions: { date: string; amount: number; payee: string }[],
  direction: "in" | "out",
  today: string,
): RegularPayment[] {
  const month = today.slice(0, 7);
  const history = Array.from({ length: HISTORY_MONTHS }, (_, i) => monthsBefore(month, i + 1));
  // payee → month → payments, as positive pence
  const byPayee = new Map<string, Map<string, { date: string; amount: number }[]>>();
  for (const t of transactions) {
    if (direction === "in" ? t.amount <= 0 : t.amount >= 0) continue;
    const m = t.date.slice(0, 7);
    if (m !== month && !history.includes(m)) continue;
    const months = byPayee.get(t.payee) ?? new Map();
    months.set(m, [...(months.get(m) ?? []), { date: t.date, amount: Math.abs(t.amount) }]);
    byPayee.set(t.payee, months);
  }

  const day = Number(today.slice(8, 10));
  const results: RegularPayment[] = [];
  for (const [payee, months] of byPayee) {
    const past = history.filter((m) => months.has(m));
    if (past.length < REGULAR_IN) continue;
    if (direction === "out" && past.some((m) => months.get(m)!.length > 1)) continue;

    const latest = months.get(past[0])!;
    const expected = latest.reduce((sum, p) => sum + p.amount, 0);
    const usualDay = median(past.map((m) => Number(months.get(m)![0].date.slice(8, 10))));
    const thisMonth = (months.get(month) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const paid = thisMonth.reduce((sum, p) => sum + p.amount, 0);
    // A share due on the 31st is due on the 30th in a 30-day month
    const dueDay = Math.min(usualDay, daysIn(month));
    const daysLate = Math.max(day - dueDay, 0);
    const fullyPaid = direction === "out" ? paid > 0 : paid >= expected - SHARE_TOLERANCE;
    const status = fullyPaid ? "paid" : paid > 0 ? "part-paid" : daysLate > GRACE_DAYS ? "late" : "due";
    results.push({
      payee,
      expected,
      usualDay,
      paid,
      lastPaidOn: thisMonth.at(-1)?.date ?? null,
      status,
      daysLate: status === "paid" ? 0 : daysLate,
    });
  }
  return results.sort((a, b) => a.usualDay - b.usualDay || a.payee.localeCompare(b.payee));
}

// ACTUAL_ACCOUNTS="House account, House pot" → only those, by name; unset → every open account
export function pickAccounts(accounts: ActualAccount[], names: string | undefined) {
  const wanted = (names ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return accounts.filter((account) =>
    wanted.length ? wanted.includes(account.name.toLowerCase()) : !account.closed,
  );
}

// Moves between the house's own accounts and the opening balance aren't money in or out
const isRealMoney = (t: ActualTransaction) => !t.transfer_id && !t.starting_balance_flag;

export function summarise(data: ActualData, today: string): Extract<HouseFinances, { status: "ok" }> {
  const month = today.slice(0, 7);
  const accountName = new Map(data.accounts.map((a) => [a.id, a.name]));
  const payeeName = new Map(data.payees.map((p) => [p.id, p.name]));
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
  const shown = data.transactions.filter((t) => accountName.has(t.account));

  let moneyIn = 0;
  let moneyOut = 0;
  const spending = new Map<string, number>();
  for (const t of shown) {
    if (!t.date.startsWith(month) || !isRealMoney(t)) continue;
    // A split transaction's parts each have their own category
    for (const part of t.subtransactions?.length ? t.subtransactions : [t]) {
      if (part.amount < 0) {
        moneyOut -= part.amount;
        const category = (part.category && categoryName.get(part.category)) ?? "Uncategorised";
        spending.set(category, (spending.get(category) ?? 0) - part.amount);
      } else {
        moneyIn += part.amount;
      }
    }
  }

  // Payments with no payee can't be told apart, so they're left out of the regular ones
  const payments = shown
    .filter((t) => isRealMoney(t) && t.payee && payeeName.has(t.payee))
    .map((t) => ({ date: t.date, amount: t.amount, payee: payeeName.get(t.payee!)! }));

  const recent = shown
    .filter((t) => !t.starting_balance_flag)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_COUNT)
    .map((t) => ({
      id: t.id,
      date: t.date,
      account: accountName.get(t.account)!,
      payee: t.transfer_id
        ? `Transfer ${t.amount < 0 ? "to" : "from"} ${(t.payee && payeeName.get(t.payee)) ?? "another account"}`
        : ((t.payee && payeeName.get(t.payee)) ?? "Unknown"),
      category: t.subtransactions?.length
        ? "Split"
        : ((t.category && categoryName.get(t.category)) ?? null),
      notes: t.notes || null,
      amount: t.amount,
    }));

  return {
    status: "ok",
    accounts: data.accounts
      .filter((a) => accountName.has(a.id))
      .map((a) => ({ name: a.name, balance: data.balances[a.id] ?? 0 })),
    month,
    moneyIn,
    moneyOut,
    spending: [...spending]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    shares: regularPayments(payments, "in", today),
    bills: regularPayments(payments, "out", today),
    recent,
  };
}

const londonDate = (time: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(time));

async function readFromActual(config: {
  serverURL: string;
  password: string;
  syncId: string;
  encryptionPassword: string | undefined;
  accounts: string | undefined;
}): Promise<ActualData> {
  // Loaded here so pages that don't show money never start Actual's engine
  const actual = await import("@actual-app/api");
  const dataDir = path.join(os.tmpdir(), "59og-actual");
  await mkdir(dataDir, { recursive: true });
  await actual.init({ dataDir, serverURL: config.serverURL, password: config.password });
  try {
    await actual.downloadBudget(config.syncId, { password: config.encryptionPassword });
    const allAccounts = await actual.getAccounts();
    const accounts = pickAccounts(allAccounts, config.accounts);
    const end = londonDate(Date.now());
    const start = `${monthsBefore(end.slice(0, 7), HISTORY_MONTHS)}-01`;
    const [transactions, balances, payees, categories] = await Promise.all([
      Promise.all(accounts.map((a) => actual.getTransactions(a.id, start, end))).then((lists) => lists.flat()),
      Promise.all(accounts.map(async (a) => [a.id, await actual.getAccountBalance(a.id)] as const)).then(
        Object.fromEntries,
      ),
      actual.getPayees(),
      actual.getCategories(),
    ]);
    // A transfer's payee stands for the other account; name it after that account
    const accountNames = new Map(allAccounts.map((a) => [a.id, a.name]));
    const named = payees.map((p) => ({
      id: p.id,
      name: (p.transfer_acct && accountNames.get(p.transfer_acct)) || p.name,
    }));
    return { accounts, balances, transactions, payees: named, categories };
  } finally {
    await actual.shutdown();
  }
}

// Actual's client holds one open budget per process, so reads take turns, and a result is kept
// for a few minutes so every dashboard visit doesn't download the budget again
const CACHE_MS = 5 * 60 * 1000;
let cached: { at: number; data: ActualData } | null = null;
let inFlight: Promise<ActualData> | null = null;

// The dashboard leaves the money card out until Actual is set up
export const isActualConfigured = () =>
  Boolean(process.env.ACTUAL_SERVER_URL && process.env.ACTUAL_PASSWORD && process.env.ACTUAL_SYNC_ID);

export async function getHouseFinances(): Promise<HouseFinances> {
  const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const syncId = process.env.ACTUAL_SYNC_ID;
  if (!serverURL || !password || !syncId) return { status: "not-configured" };

  try {
    if (!cached || Date.now() - cached.at > CACHE_MS) {
      inFlight ??= readFromActual({
        serverURL,
        password,
        syncId,
        encryptionPassword: process.env.ACTUAL_ENCRYPTION_PASSWORD || undefined,
        accounts: process.env.ACTUAL_ACCOUNTS,
      }).finally(() => {
        inFlight = null;
      });
      cached = { at: Date.now(), data: await inFlight };
    }
    return summarise(cached.data, londonDate(Date.now()));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
