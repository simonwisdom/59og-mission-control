import { describe, expect, it } from "vitest";
import { formatForWhatsApp } from "./share-text";

const app = {
  name: "Simon",
  email: "simon@example.com",
  arrivalDate: "2026-10-09",
  departureDate: "2026-10-11",
  partySize: 1,
  about: "I'm testing this, woohoo!",
  connection: "Erybody",
  anythingElse: "Allergic to loneliness",
  status: "pending" as const,
};
const url = "https://example.com/dashboard/applications/3";

describe("formatForWhatsApp", () => {
  it("leads with the name in WhatsApp bold", () => {
    expect(formatForWhatsApp(app, url).split("\n")[0]).toBe("*Simon* would like to stay");
  });

  it("includes the dates and party size", () => {
    expect(formatForWhatsApp(app, url)).toContain("9 Oct 2026 to 11 Oct 2026 · 1 person");
  });

  it("pluralises people", () => {
    expect(formatForWhatsApp({ ...app, partySize: 3 }, url)).toContain("· 3 people");
  });

  it("quotes every line of the message", () => {
    const text = formatForWhatsApp({ ...app, about: "Line one\nLine two" }, url);
    expect(text).toContain("> Line one\n> Line two");
  });

  it("includes who they know and the P.S.", () => {
    const text = formatForWhatsApp(app, url);
    expect(text).toMatch(/Knows: Erybody[\s\S]*P\.S\. Allergic to loneliness/);
  });

  it("leaves out optional lines that are empty", () => {
    const text = formatForWhatsApp({ ...app, connection: null, anythingElse: null }, url);
    expect(text).not.toMatch(/Knows:|P\.S\./);
  });

  it("never includes the applicant's email", () => {
    expect(formatForWhatsApp(app, url)).not.toContain("simon@example.com");
  });

  it("ends with a link to the application", () => {
    expect(formatForWhatsApp(app, url).endsWith(url)).toBe(true);
  });
});
