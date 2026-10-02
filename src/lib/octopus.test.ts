import { describe, expect, it } from "vitest";
import { KWH_PER_M3, metersFromAccount, toDailyKWh } from "./octopus";

describe("metersFromAccount", () => {
  it("picks the current property's import electricity and gas meters", () => {
    const meters = metersFromAccount({
      properties: [
        { moved_out_at: "2024-01-01T00:00:00Z", electricity_meter_points: [{ mpan: "old", meters: [] }] },
        {
          moved_out_at: null,
          electricity_meter_points: [
            { mpan: "export", is_export: true, meters: [{ serial_number: "E0" }] },
            { mpan: "123", is_export: false, meters: [{ serial_number: "E1" }] },
          ],
          gas_meter_points: [{ mprn: "456", meters: [{ serial_number: "G1" }] }],
        },
      ],
    });
    expect(meters).toEqual([
      { fuel: "electricity", pointId: "123", serials: ["E1"] },
      { fuel: "gas", pointId: "456", serials: ["G1"] },
    ]);
  });

  it("returns nothing for an account with no properties", () => {
    expect(metersFromAccount({ properties: [] })).toEqual([]);
  });
});

describe("toDailyKWh", () => {
  const results = [
    { consumption: 2, interval_start: "2026-09-30T00:00:00+01:00" },
    { consumption: 3, interval_start: "2026-09-29T00:00:00+01:00" },
  ];

  it("keys electricity by local date, oldest first", () => {
    expect(toDailyKWh(results, "electricity", "m3")).toEqual([
      { date: "2026-09-29", kWh: 3 },
      { date: "2026-09-30", kWh: 2 },
    ]);
  });

  it("converts gas from cubic metres", () => {
    expect(toDailyKWh(results, "gas", "m3")[0].kWh).toBeCloseTo(3 * KWH_PER_M3);
  });

  it("leaves gas alone when the meter reports kWh", () => {
    expect(toDailyKWh(results, "gas", "kWh")[0].kWh).toBe(3);
  });
});
