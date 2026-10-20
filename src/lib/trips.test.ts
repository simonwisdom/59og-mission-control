import { describe, expect, it } from "vitest";
import { knownPeople, parseTrip, samePerson, tripTitle } from "./trips";

describe("parseTrip", () => {
  it("accepts a trip and turns a blank place into null", () => {
    expect(parseTrip({ person: " Rita ", leaveDate: "2026-11-02", backDate: "2026-11-06", place: "  " })).toEqual({
      success: true,
      data: { person: "Rita", leaveDate: "2026-11-02", backDate: "2026-11-06", place: null },
    });
  });

  it("allows a trip that comes back the same day", () => {
    expect(parseTrip({ person: "Rita", leaveDate: "2026-11-02", backDate: "2026-11-02" }).success).toBe(true);
  });

  it("says what's wrong with each field", () => {
    expect(parseTrip({ person: "", leaveDate: "2 Nov", backDate: undefined })).toEqual({
      success: false,
      errors: { person: "Say who's going", leaveDate: "Choose the day you leave", backDate: "Choose the day you're back" },
    });
  });

  it("turns away a return before leaving, or more than a year away", () => {
    expect(parseTrip({ person: "Rita", leaveDate: "2026-11-06", backDate: "2026-11-02" })).toEqual({
      success: false,
      errors: { backDate: "Back must be on or after leaving" },
    });
    expect(parseTrip({ person: "Rita", leaveDate: "2026-11-06", backDate: "2027-12-02" })).toEqual({
      success: false,
      errors: { backDate: "That's over a year away; check the year" },
    });
  });
});

describe("tripTitle", () => {
  it("names the place when there is one", () => {
    expect(tripTitle({ person: "Rita", place: "Lisbon" })).toBe("Rita away · Lisbon");
    expect(tripTitle({ person: "Rita", place: null })).toBe("Rita away");
  });
});

describe("knownPeople", () => {
  it("sorts names and drops repeats in another case", () => {
    expect(knownPeople(["simon", "Rita", " Simon", ""])).toEqual(["Rita", "simon"]);
  });
});

describe("samePerson", () => {
  it("matches names whatever their case or spaces", () => {
    expect(samePerson(" rita", "Rita")).toBe(true);
    expect(samePerson("Rita", "Rito")).toBe(false);
  });
});
