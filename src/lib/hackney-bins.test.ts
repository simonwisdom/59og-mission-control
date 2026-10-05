import { describe, expect, it } from "vitest";
import { binName, upcomingCollections } from "./hackney-bins";

describe("binName", () => {
  it("names Hackney's containers by what goes in them", () => {
    expect(binName("Recycling Sack ")).toBe("Recycling");
    expect(binName("Food Caddy (Small) ")).toBe("Food waste");
    expect(binName("Wheeled Bin (180ltr) ")).toBe("Rubbish");
    expect(binName(" Garden Sack ")).toBe("Garden Sack");
  });
});

describe("upcomingCollections", () => {
  const weekly = ["2026-09-29T01:20:00Z", "2026-10-06T01:02:00Z", "2026-10-13T01:20:00Z", "2026-10-27T02:20:00Z"];

  it("groups bins by London day, from today, soonest first", () => {
    const collections = upcomingCollections(
      [
        { name: "Rubbish", dates: ["2026-10-27T02:20:00Z", "2026-10-13T01:20:00Z"] },
        { name: "Recycling", dates: weekly },
        { name: "Food waste", dates: weekly },
      ],
      "2026-10-06",
    );
    expect(collections).toEqual([
      { date: "2026-10-06", bins: ["Recycling", "Food waste"] },
      { date: "2026-10-13", bins: ["Rubbish", "Recycling", "Food waste"] },
      { date: "2026-10-27", bins: ["Rubbish", "Recycling", "Food waste"] },
    ]);
  });

  it("uses the London date when the UTC timestamp is the evening before", () => {
    // 23:30 UTC in summer time is 00:30 the next day in London
    expect(upcomingCollections([{ name: "Recycling", dates: ["2026-07-06T23:30:00Z"] }], "2026-07-01")).toEqual([
      { date: "2026-07-07", bins: ["Recycling"] },
    ]);
  });

  it("lists a bin once when two of its schedules land on the same day", () => {
    expect(
      upcomingCollections([{ name: "Rubbish", dates: ["2026-10-13T01:20:00Z", "2026-10-13T02:20:00Z"] }], "2026-10-01"),
    ).toEqual([{ date: "2026-10-13", bins: ["Rubbish"] }]);
  });
});
