import type { Application } from "@/db/schema";
import { formatDate } from "./format";

type Shareable = Pick<
  Application,
  "name" | "arrivalDate" | "departureDate" | "partySize" | "about" | "connection" | "anythingElse"
>;

// Summary for pasting into the house WhatsApp. Uses WhatsApp's *bold* and "> " quote
// formatting. Deliberately leaves out the email: chat messages get forwarded.
export function formatForWhatsApp(app: Shareable, url: string) {
  const people = app.partySize === 1 ? "1 person" : `${app.partySize} people`;
  const quoted = app.about
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return [
    `*${app.name}* would like to stay`,
    `${formatDate(app.arrivalDate)} to ${formatDate(app.departureDate)} · ${people}`,
    app.connection && `Knows: ${app.connection}`,
    "",
    quoted,
    app.anythingElse && `\nP.S. ${app.anythingElse}`,
    "",
    `Notes and votes: ${url}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
