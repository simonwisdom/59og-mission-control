import { describe, expect, it } from "vitest";
import { KWH_PER_M3, metersFromAccount, productCode, rateAt, toDailyUsage, type Rate } from "./octopus";

describe("metersFromAccount", () => {
  it("picks the current property's import electricity and gas meters", () => {
    const meters = metersFromAccount({
      properties: [
        { moved_out_at: "2024-01-01T00:00:00Z", electricity_meter_points: [{ mpan: "old", meters: [] }] },
        {
          moved_out_at: null,
          electricity_meter_points: [
            { mpan: "export", is_export: true, meters: [{ serial_number: "E0" }] },
            {
              mpan: "123",
              is_export: false,
              meters: [{ serial_number: "E1" }],
              agreements: [{ tariff_code: "E-1R-VAR-22-11-01-C", valid_from: "2024-01-01T00:00:00Z", valid_to: null }],
            },
          ],
          gas_meter_points: [{ mprn: "456", meters: [{ serial_number: "G1" }] }],
        },
      ],
    });
    expect(meters).toEqual([
      {
        fuel: "electricity",
        pointId: "123",
        serials: ["E1"],
        agreements: [{ tariff_code: "E-1R-VAR-22-11-01-C", valid_from: "2024-01-01T00:00:00Z", valid_to: null }],
      },
      { fuel: "gas", pointId: "456", serials: ["G1"], agreements: [] },
    ]);
  });

  it("returns nothing for an account with no properties", () => {
    expect(metersFromAccount({ properties: [] })).toEqual([]);
  });
});

describe("productCode", () => {
  it("strips the fuel, rate count and region from a tariff code", () => {
    expect(productCode("E-1R-VAR-22-11-01-C")).toBe("VAR-22-11-01");
    expect(productCode("G-1R-AGILE-24-10-01-C")).toBe("AGILE-24-10-01");
  });
});

const rate = (pence: number, from: string, to: string | null, method: string | null = null): Rate => ({
  value_inc_vat: pence,
  valid_from: from,
  valid_to: to,
  payment_method: method,
});

describe("rateAt", () => {
  const rates = [
    rate(30, "2026-09-30T23:00:00Z", null, "NON_DIRECT_DEBIT"),
    rate(25, "2026-09-30T23:00:00Z", null, "DIRECT_DEBIT"),
    rate(20, "2026-06-30T23:00:00Z", "2026-09-30T23:00:00Z", "DIRECT_DEBIT"),
  ];

  it("takes the direct debit rate in force at that moment", () => {
    expect(rateAt(rates, Date.parse("2026-10-02T10:00:00Z"))).toBe(25);
    expect(rateAt(rates, Date.parse("2026-09-30T22:59:00Z"))).toBe(20);
  });

  it("returns null before any rate starts", () => {
    expect(rateAt(rates, Date.parse("2026-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("toDailyUsage", () => {
  const results = [
    { consumption: 2, interval_start: "2026-09-30T00:00:00+01:00" },
    { consumption: 3, interval_start: "2026-09-29T00:00:00+01:00" },
  ];

  it("keys electricity by local date, oldest first", () => {
    expect(toDailyUsage(results, "electricity", "m3", null)).toEqual([
      { date: "2026-09-29", kWh: 3, cost: null, readings: 1 },
      { date: "2026-09-30", kWh: 2, cost: null, readings: 1 },
    ]);
  });

  it("converts gas from cubic metres", () => {
    expect(toDailyUsage(results, "gas", "m3", null)[0].kWh).toBeCloseTo(3 * KWH_PER_M3);
  });

  it("leaves gas alone when the meter reports kWh", () => {
    expect(toDailyUsage(results, "gas", "kWh", null)[0].kWh).toBe(3);
  });

  it("prices each half hour at its own rate and adds a standing charge per day", () => {
    const halfHours = [
      { consumption: 1, interval_start: "2026-10-01T00:30:00+01:00" },
      { consumption: 2, interval_start: "2026-10-01T06:00:00+01:00" },
    ];
    const prices = {
      // Cheap overnight until 05:30 local (04:30 UTC), like Octopus Go
      unitRates: [
        rate(8, "2026-09-30T23:30:00Z", "2026-10-01T04:30:00Z"),
        rate(30, "2026-10-01T04:30:00Z", "2026-10-01T23:30:00Z"),
      ],
      standingCharges: [rate(50, "2026-09-30T23:00:00Z", null)],
    };
    const [day] = toDailyUsage(halfHours, "electricity", "m3", prices);
    expect(day.kWh).toBe(3);
    expect(day.readings).toBe(2);
    expect(day.cost).toBeCloseTo((1 * 8 + 2 * 30 + 50) / 100);
  });

  it("gives no cost for a day with a half hour it can't price", () => {
    const prices = { unitRates: [], standingCharges: [rate(50, "2026-01-01T00:00:00Z", null)] };
    expect(toDailyUsage(results, "electricity", "m3", prices)[0].cost).toBeNull();
  });
});
