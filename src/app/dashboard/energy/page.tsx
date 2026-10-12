import type { Metadata } from "next";
import { getEnergyUsage } from "@/lib/octopus";
import { Crumbs } from "../crumbs";
import { UsageChart } from "./usage-chart";

export const metadata: Metadata = { title: "Energy" };

export default async function EnergyPage() {
  const energy = await getEnergyUsage(30);

  return (
    <>
      <Crumbs />
      <h1 className="hand mb-6 text-2xl">Energy</h1>

      {energy.status === "not-configured" && (
        <p className="card text-sm text-muted">
          To see electricity and gas use, set <code>OCTOPUS_API_KEY</code> and <code>OCTOPUS_ACCOUNT_NUMBER</code> on
          Railway. Both are on the Octopus website under Personal details &gt; API access.
        </p>
      )}
      {energy.status === "error" && (
        <p className="card text-sm text-danger">Couldn&apos;t load usage from Octopus: {energy.message}</p>
      )}
      {energy.status === "ok" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {energy.electricity && <UsageChart title="Electricity" days={energy.electricity} />}
          {energy.gas && <UsageChart title="Gas" days={energy.gas} />}
        </div>
      )}
      {energy.status === "ok" && (
        <p className="mt-2 text-xs text-muted">
          From the smart meters via Octopus, usually a day behind. Gas is converted from cubic metres to kWh the same
          way the bill does. Costs are estimated from the tariff&apos;s unit rates and standing charges, including VAT;
          they leave out credits and discounts, so the bill may differ slightly.
        </p>
      )}
    </>
  );
}
