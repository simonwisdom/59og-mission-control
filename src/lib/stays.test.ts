import { describe, expect, it } from "vitest";
import { parseStay, stayRow } from "./stays";

describe("parseStay", () => {
  it("accepts a stay and reads the party size from a form's text", () => {
    expect(parseStay({ addedBy: " Rita ", name: " Sam Okafor ", partySize: "2", arrivalDate: "2026-11-07", departureDate: "2026-11-09" })).toEqual({
      success: true,
      data: { addedBy: "Rita", name: "Sam Okafor", partySize: 2, arrivalDate: "2026-11-07", departureDate: "2026-11-09" },
      confirmed: true,
    });
  });

  it("reads confirmed apart from the stay, true unless it's false, and only as true or false", () => {
    const stay = { addedBy: "Rita", name: "Sam", partySize: 1, arrivalDate: "2026-11-07", departureDate: "2026-11-09" };
    const data = { addedBy: "Rita", name: "Sam", partySize: 1, arrivalDate: "2026-11-07", departureDate: "2026-11-09" };
    expect(parseStay({ ...stay, confirmed: false })).toEqual({ success: true, data, confirmed: false });
    expect(parseStay({ ...stay, confirmed: true })).toEqual({ success: true, data, confirmed: true });
    expect(parseStay(stay)).toEqual({ success: true, data, confirmed: true });
    expect(parseStay({ ...stay, confirmed: null })).toEqual({ success: true, data, confirmed: true });
    for (const confirmed of ["false", 0, "no", {}]) {
      expect(parseStay({ ...stay, confirmed })).toEqual({ success: false, errors: { confirmed: "Say true or false for confirmed" } });
    }
  });

  it("says what's wrong with each field", () => {
    expect(parseStay({ addedBy: "", name: "", partySize: 0, arrivalDate: "7 Nov" })).toEqual({
      success: false,
      errors: {
        addedBy: "Say whose guest it is",
        name: "Say who's coming",
        partySize: "At least 1 person",
        arrivalDate: "Choose the day they arrive",
        departureDate: "Choose the day they leave",
      },
    });
  });

  it("turns away leaving before arriving, or more than a year away", () => {
    const stay = { addedBy: "Rita", name: "Sam", partySize: 1 };
    expect(parseStay({ ...stay, arrivalDate: "2026-11-09", departureDate: "2026-11-07" })).toEqual({
      success: false,
      errors: { departureDate: "Leaving must be on or after arriving" },
    });
    expect(parseStay({ ...stay, arrivalDate: "2026-11-07", departureDate: "2027-12-01" })).toEqual({
      success: false,
      errors: { departureDate: "That's over a year away; check the year" },
    });
  });
});

describe("stayRow", () => {
  it("saves a housemate's stay as confirmed, with no application text", () => {
    expect(stayRow({ addedBy: "Rita", name: "Sam", partySize: 1, arrivalDate: "2026-11-07", departureDate: "2026-11-09" })).toEqual({
      addedBy: "Rita",
      name: "Sam",
      partySize: 1,
      arrivalDate: "2026-11-07",
      departureDate: "2026-11-09",
      status: "approved",
      agreedToRules: false,
      email: null,
      about: null,
    });
  });

  it("saves one not confirmed yet as pending, otherwise the same", () => {
    const stay = { addedBy: "Rita", name: "Sam", partySize: 1, arrivalDate: "2026-11-07", departureDate: "2026-11-09" };
    expect(stayRow(stay, false)).toEqual({ ...stayRow(stay), status: "pending" });
    expect(stayRow(stay, true).status).toBe("approved");
  });
});
