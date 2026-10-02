// Reads smart meter usage from the Octopus Energy API.
// Docs: https://developer.octopus.energy/rest/guides/endpoints
// Needs OCTOPUS_API_KEY and OCTOPUS_ACCOUNT_NUMBER (both on the Octopus dashboard under
// Personal details > API access). The meters are looked up from the account.

const API = "https://api.octopus.energy/v1";

export type Fuel = "electricity" | "gas";
export type DailyUsage = { date: string; kWh: number };
export type Meter = { fuel: Fuel; pointId: string; serials: string[] };

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
    electricity_meter_points?: { mpan: string; is_export?: boolean; meters: { serial_number: string }[] }[];
    gas_meter_points?: { mprn: string; meters: { serial_number: string }[] }[];
  }[];
};

type ConsumptionResponse = {
  results: { consumption: number; interval_start: string }[];
};

export function metersFromAccount(account: AccountResponse): Meter[] {
  const property = account.properties.find((p) => !p.moved_out_at) ?? account.properties[0];
  if (!property) return [];
  const electricity = (property.electricity_meter_points ?? [])
    .filter((point) => !point.is_export)
    .map((point) => ({
      fuel: "electricity" as const,
      pointId: point.mpan,
      serials: point.meters.map((m) => m.serial_number),
    }));
  const gas = (property.gas_meter_points ?? []).map((point) => ({
    fuel: "gas" as const,
    pointId: point.mprn,
    serials: point.meters.map((m) => m.serial_number),
  }));
  return [...electricity, ...gas];
}

export function toDailyKWh(
  results: ConsumptionResponse["results"],
  fuel: Fuel,
  gasUnit: "m3" | "kWh",
): DailyUsage[] {
  const factor = fuel === "gas" && gasUnit === "m3" ? KWH_PER_M3 : 1;
  const byDay = new Map<string, number>();
  for (const row of results) {
    // interval_start is local time with an offset, e.g. "2026-09-30T00:00:00+01:00"
    const date = row.interval_start.slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + row.consumption * factor);
  }
  return [...byDay]
    .map(([date, kWh]) => ({ date, kWh }))
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

async function dailyUsage(meter: Meter, apiKey: string, from: Date, gasUnit: "m3" | "kWh") {
  const base = meter.fuel === "electricity" ? "electricity-meter-points" : "gas-meter-points";
  const query = new URLSearchParams({
    period_from: from.toISOString(),
    group_by: "day",
    order_by: "period",
    page_size: "100",
  });
  // A point keeps old meters in its list after a swap; the newest is usually last.
  for (const serial of [...meter.serials].reverse()) {
    const data = await octopusGet<ConsumptionResponse>(
      `/${base}/${meter.pointId}/meters/${serial}/consumption/?${query}`,
      apiKey,
    );
    if (data.results.length > 0) return toDailyKWh(data.results, meter.fuel, gasUnit);
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
      return meter ? dailyUsage(meter, apiKey, from, gasUnit) : null;
    };
    const [electricity, gas] = await Promise.all([usage("electricity"), usage("gas")]);
    return { status: "ok", electricity, gas };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
