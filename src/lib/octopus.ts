// Reads smart meter usage from the Octopus Energy API, and prices it with the account's tariff.
// Docs: https://developer.octopus.energy/rest/guides/endpoints
// Needs OCTOPUS_API_KEY and OCTOPUS_ACCOUNT_NUMBER (both on the Octopus dashboard under
// Personal details > API access). The meters are looked up from the account.

const API = "https://api.octopus.energy/v1";

export type Fuel = "electricity" | "gas";
// cost is in pounds including VAT, or null when the tariff couldn't be priced
export type DailyUsage = { date: string; kWh: number; cost: number | null };
export type Agreement = { tariff_code: string; valid_from: string; valid_to: string | null };
export type Meter = { fuel: Fuel; pointId: string; serials: string[]; agreements: Agreement[] };
// Prices in pence from the products API: per kWh for unit rates, per day for standing charges
export type Rate = { value_inc_vat: number; valid_from: string; valid_to: string | null; payment_method: string | null };
export type Prices = { unitRates: Rate[]; standingCharges: Rate[] };

export type EnergyUsage =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ok"; electricity: DailyUsage[] | null; gas: DailyUsage[] | null };

// SMETS2 gas meters report cubic metres. This is the standard conversion Octopus uses on
// bills: volume correction × a typical calorific value ÷ 3.6. SMETS1 gas meters already
// report kWh, so set OCTOPUS_GAS_UNIT=kWh for those.
export const KWH_PER_M3 = (1.02264 * 39.5) / 3.6;

type AccountResponse = {
  properties: {
    moved_out_at: string | null;
    electricity_meter_points?: {
      mpan: string;
      is_export?: boolean;
      meters: { serial_number: string }[];
      agreements?: Agreement[];
    }[];
    gas_meter_points?: { mprn: string; meters: { serial_number: string }[]; agreements?: Agreement[] }[];
  }[];
};

type ConsumptionResponse = {
  results: { consumption: number; interval_start: string }[];
};

type RatesResponse = { results: Rate[] };

export function metersFromAccount(account: AccountResponse): Meter[] {
  const property = account.properties.find((p) => !p.moved_out_at) ?? account.properties[0];
  if (!property) return [];
  const electricity = (property.electricity_meter_points ?? [])
    .filter((point) => !point.is_export)
    .map((point) => ({
      fuel: "electricity" as const,
      pointId: point.mpan,
      serials: point.meters.map((m) => m.serial_number),
      agreements: point.agreements ?? [],
    }));
  const gas = (property.gas_meter_points ?? []).map((point) => ({
    fuel: "gas" as const,
    pointId: point.mprn,
    serials: point.meters.map((m) => m.serial_number),
    agreements: point.agreements ?? [],
  }));
  return [...electricity, ...gas];
}

// "E-1R-VAR-22-11-01-C" belongs to the product "VAR-22-11-01"
export function productCode(tariffCode: string) {
  return tariffCode.split("-").slice(2, -1).join("-");
}

// The rate in force at a moment. Variable tariffs list a direct debit and a non direct debit
// price for each period; the house pays by direct debit.
export function rateAt(rates: Rate[], time: number): number | null {
  const rate = rates.find(
    (r) =>
      r.payment_method !== "NON_DIRECT_DEBIT" &&
      Date.parse(r.valid_from) <= time &&
      (r.valid_to === null || time < Date.parse(r.valid_to)),
  );
  return rate ? rate.value_inc_vat : null;
}

// Sums half-hourly readings into days. Each half hour is priced at the rate in force then, so
// time-of-use tariffs like Agile and Go come out right; each day adds one standing charge.
export function toDailyUsage(
  results: ConsumptionResponse["results"],
  fuel: Fuel,
  gasUnit: "m3" | "kWh",
  prices: Prices | null,
): DailyUsage[] {
  const factor = fuel === "gas" && gasUnit === "m3" ? KWH_PER_M3 : 1;
  const byDay = new Map<string, { kWh: number; pence: number | null }>();
  for (const row of results) {
    // interval_start is local time with an offset, e.g. "2026-09-30T00:00:00+01:00"
    const date = row.interval_start.slice(0, 10);
    const day = byDay.get(date) ?? { kWh: 0, pence: prices ? 0 : null };
    const kWh = row.consumption * factor;
    const rate = prices && rateAt(prices.unitRates, Date.parse(row.interval_start));
    day.kWh += kWh;
    day.pence = day.pence !== null && rate != null ? day.pence + kWh * rate : null;
    byDay.set(date, day);
  }
  return [...byDay]
    .map(([date, { kWh, pence }]) => {
      // Standing charges change at local midnight, so midday UTC is safely inside the day
      const standing = prices && rateAt(prices.standingCharges, Date.parse(`${date}T12:00:00Z`));
      const cost = pence !== null && standing != null ? (pence + standing) / 100 : null;
      return { date, kWh, cost };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function octopusGet<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
    // Smart meter data only arrives once a day, so an hourly cache is plenty
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Octopus API returned ${response.status} for ${path.split("?")[0]}`);
  return response.json() as Promise<T>;
}

// Unit rates and standing charges for every tariff the meter was on since `from`. Only
// single-rate tariffs (E-1R, G-1R) are priced; Economy 7 style tariffs return null.
async function tariffPrices(meter: Meter, apiKey: string, from: Date): Promise<Prices | null> {
  const now = Date.now();
  const agreements = meter.agreements.filter(
    (a) => Date.parse(a.valid_from) < now && (a.valid_to === null || Date.parse(a.valid_to) > from.getTime()),
  );
  if (agreements.length === 0 || agreements.some((a) => !/^[EG]-1R-/.test(a.tariff_code))) return null;

  const tariffs = meter.fuel === "electricity" ? "electricity-tariffs" : "gas-tariffs";
  const prices: Prices = { unitRates: [], standingCharges: [] };
  for (const agreement of agreements) {
    const query = new URLSearchParams({
      period_from: new Date(Math.max(Date.parse(agreement.valid_from), from.getTime())).toISOString(),
      // Agile has a rate for every half hour: 30 days is 1440 of them
      page_size: "1500",
    });
    if (agreement.valid_to) query.set("period_to", agreement.valid_to);
    const path = `/products/${productCode(agreement.tariff_code)}/${tariffs}/${agreement.tariff_code}`;
    const [unitRates, standingCharges] = await Promise.all([
      octopusGet<RatesResponse>(`${path}/standard-unit-rates/?${query}`, apiKey),
      octopusGet<RatesResponse>(`${path}/standing-charges/?${query}`, apiKey),
    ]);
    prices.unitRates.push(...unitRates.results);
    prices.standingCharges.push(...standingCharges.results);
  }
  return prices;
}

async function dailyUsage(meter: Meter, apiKey: string, from: Date, days: number, gasUnit: "m3" | "kWh") {
  const base = meter.fuel === "electricity" ? "electricity-meter-points" : "gas-meter-points";
  const query = new URLSearchParams({
    period_from: from.toISOString(),
    order_by: "period",
    // Half-hourly readings, so each can be priced at its own rate
    page_size: String((days + 1) * 48),
  });
  // Usage still shows if pricing fails, just without costs
  const prices = await tariffPrices(meter, apiKey, from).catch(() => null);
  // A point keeps old meters in its list after a swap; the newest is usually last.
  for (const serial of [...meter.serials].reverse()) {
    const data = await octopusGet<ConsumptionResponse>(
      `/${base}/${meter.pointId}/meters/${serial}/consumption/?${query}`,
      apiKey,
    );
    if (data.results.length > 0) return toDailyUsage(data.results, meter.fuel, gasUnit, prices);
  }
  return [];
}

export async function getEnergyUsage(days = 30): Promise<EnergyUsage> {
  const apiKey = process.env.OCTOPUS_API_KEY;
  const accountNumber = process.env.OCTOPUS_ACCOUNT_NUMBER;
  if (!apiKey || !accountNumber) return { status: "not-configured" };
  const gasUnit = process.env.OCTOPUS_GAS_UNIT?.toLowerCase() === "kwh" ? "kWh" : "m3";

  try {
    const account = await octopusGet<AccountResponse>(`/accounts/${encodeURIComponent(accountNumber)}/`, apiKey);
    const meters = metersFromAccount(account);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usage = async (fuel: Fuel) => {
      const meter = meters.find((m) => m.fuel === fuel);
      return meter ? dailyUsage(meter, apiKey, from, days, gasUnit) : null;
    };
    const [electricity, gas] = await Promise.all([usage("electricity"), usage("gas")]);
    return { status: "ok", electricity, gas };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
