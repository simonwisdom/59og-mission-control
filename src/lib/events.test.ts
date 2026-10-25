import { describe, expect, it } from "vitest";
import { eventEnd, eventLabel, parseEvent } from "./events";

const dinner = { addedBy: "Rita", title: "Dinner", date: "2026-11-07" };

describe("parseEvent", () => {
  it("accepts an event and turns blank boxes into null", () => {
    expect(parseEvent({ ...dinner, addedBy: " Rita ", endDate: "", time: " ", place: "", link: "" })).toEqual({
      success: true,
      data: { addedBy: "Rita", title: "Dinner", date: "2026-11-07", endDate: null, time: null, place: null, link: null },
    });
  });

  it("keeps a run of days, and drops an end date on the same day", () => {
    const festival = parseEvent({ ...dinner, endDate: "2026-11-09", time: "doors 7", place: "Cafe Oto", link: "https://example.com/e/1" });
    expect(festival).toEqual({
      success: true,
      data: { ...dinner, endDate: "2026-11-09", time: "doors 7", place: "Cafe Oto", link: "https://example.com/e/1" },
    });
    expect(parseEvent({ ...dinner, endDate: "2026-11-07" })).toMatchObject({ success: true, data: { endDate: null } });
  });

  it("says what's wrong with each field", () => {
    expect(parseEvent({ addedBy: "", title: " ", date: "7 Nov" })).toEqual({
      success: false,
      errors: { addedBy: "Say who's adding it", title: "Say what's on", date: "Choose the day it's on" },
    });
  });

  it("turns away an end before the start, a run over a month, and a link that isn't a web link", () => {
    expect(parseEvent({ ...dinner, endDate: "2026-11-01" })).toEqual({
      success: false,
      errors: { endDate: "The last day must be on or after the first" },
    });
    expect(parseEvent({ ...dinner, endDate: "2026-12-20" })).toEqual({
      success: false,
      errors: { endDate: "That's over a month; check the dates" },
    });
    expect(parseEvent({ ...dinner, link: "javascript:alert(1)" })).toEqual({
      success: false,
      errors: { link: "Use a web link starting with https://" },
    });
  });
});

describe("eventLabel and eventEnd", () => {
  it("names the event with what's known, and its last day", () => {
    expect(eventLabel({ title: "Jazz night", time: "8pm", place: "Cafe Oto" })).toBe("Jazz night · 8pm · Cafe Oto");
    expect(eventLabel({ title: "Jazz night", time: null, place: null })).toBe("Jazz night");
    expect(eventEnd({ date: "2026-11-07", endDate: null })).toBe("2026-11-07");
    expect(eventEnd({ date: "2026-11-07", endDate: "2026-11-09" })).toBe("2026-11-09");
  });
});
