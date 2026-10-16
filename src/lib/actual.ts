// Reads the house money from Actual Budget (https://actualbudget.org): balances, this month's money
// in and out, spending by category and recent transactions.
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
export type PayeeTotal = { payee: string; amount: number };

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
      // Money in this month by who it came from, biggest first: housemates' contributions
      paidIn: PayeeTotal[];
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
// Transactions are read from this many days back: enough for this month and a page of recent ones
const LOOKBACK_DAYS = 45;

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
  const paidIn = new Map<string, number>();
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
        const payee = (t.payee && payeeName.get(t.payee)) ?? "Unknown";
        paidIn.set(payee, (paidIn.get(payee) ?? 0) + part.amount);
      }
    }
  }

  const byAmount = <K extends string>(key: K, totals: Map<string, number>) =>
    [...totals]
      .map(([name, amount]) => ({ [key]: name, amount }) as Record<K, string> & { amount: number })
      .sort((a, b) => b.amount - a.amount);

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
    spending: byAmount("category", spending),
    paidIn: byAmount("payee", paidIn),
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
    const start = londonDate(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const end = londonDate(Date.now());
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
