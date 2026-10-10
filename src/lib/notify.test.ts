import { describe, expect, it } from "vitest";
import { newApplicationMessage } from "./notify";

const app = {
  id: 3,
  name: "  Ada Lovelace ",
  arrivalDate: "2026-10-09",
  departureDate: "2026-10-11",
  partySize: 2,
};

describe("newApplicationMessage", () => {
  it("gives only the first name, dates and party size", () => {
    expect(newApplicationMessage(app, undefined).message).toBe("Ada, 9 Oct 2026 to 11 Oct 2026, 2 people");
  });

  it("opens the application when the app URL is set", () => {
    const message = newApplicationMessage(app, "https://example.com/");
    expect(message.click).toBe("https://example.com/dashboard/applications/3");
    expect(message.actions).toEqual([
      { action: "view", label: "Open", url: "https://example.com/dashboard/applications/3" },
    ]);
  });

  it("leaves out the link when the app URL isn't set", () => {
    const message = newApplicationMessage(app, undefined);
    expect(message).not.toHaveProperty("click");
    expect(message).not.toHaveProperty("actions");
  });
});
