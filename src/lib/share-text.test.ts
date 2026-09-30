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

  it("labels the dates", () => {
    expect(formatForWhatsApp(app, url)).toContain("*Dates:* 9 Oct 2026 to 11 Oct 2026");
  });

  it("labels the group size", () => {
    expect(formatForWhatsApp(app, url)).toContain("*Group size:* 1 person");
  });

  it("pluralises people", () => {
    expect(formatForWhatsApp({ ...app, partySize: 3 }, url)).toContain("*Group size:* 3 people");
  });

  it("puts a label above the message", () => {
    expect(formatForWhatsApp(app, url)).toContain("*About them and their visit*\n> I'm testing this");
  });

  it("quotes every line of the message", () => {
    const text = formatForWhatsApp({ ...app, about: "Line one\nLine two" }, url);
    expect(text).toContain("> Line one\n> Line two");
  });

  it("labels who they know", () => {
    expect(formatForWhatsApp(app, url)).toContain("*Who they know here:* Erybody");
  });

  it("labels and quotes anything we should know", () => {
    expect(formatForWhatsApp(app, url)).toContain("*Anything we should know*\n> Allergic to loneliness");
  });

  it("leaves out optional lines that are empty", () => {
    const text = formatForWhatsApp({ ...app, connection: null, anythingElse: null }, url);
    expect(text).not.toMatch(/Who they know here|Anything we should know/);
  });

  it("never includes the applicant's email", () => {
    expect(formatForWhatsApp(app, url)).not.toContain("simon@example.com");
  });

  it("ends with a link to the application", () => {
    expect(formatForWhatsApp(app, url).endsWith(url)).toBe(true);
  });
});
