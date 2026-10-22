import type { Application } from "@/db/schema";
import { FIELD_LABELS, formatPartySize } from "./field-labels";
import { formatDate } from "./format";

type Shareable = Pick<
  Application,
  "name" | "arrivalDate" | "departureDate" | "partySize" | "about" | "offering" | "connection" | "anythingElse"
>;

function quote(text: string) {
  return text
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

// Summary for pasting into the house WhatsApp. Uses WhatsApp's *bold* and "> " quote
// formatting. Deliberately leaves out the email: chat messages get forwarded.
export function formatForWhatsApp(app: Shareable, url: string) {
  return [
    `*${app.name}* would like to stay`,
    `*${FIELD_LABELS.dates}:* ${formatDate(app.arrivalDate)} to ${formatDate(app.departureDate)}`,
    `*${FIELD_LABELS.partySize}:* ${formatPartySize(app.partySize)}`,
    app.connection && `*${FIELD_LABELS.connection}:* ${app.connection}`,
    "",
    `*${FIELD_LABELS.about}*`,
    app.about && quote(app.about),
    app.offering && `\n*${FIELD_LABELS.offering}*\n${quote(app.offering)}`,
    app.anythingElse && `\n*${FIELD_LABELS.anythingElse}*\n${quote(app.anythingElse)}`,
    "",
    `Notes and votes: ${url}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
