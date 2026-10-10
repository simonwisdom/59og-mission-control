import type { Application } from "@/db/schema";
import { formatPartySize } from "./field-labels";
import { formatDate } from "./format";

// Push notifications to housemates' phones through ntfy (https://ntfy.sh). Housemates install
// the ntfy app and subscribe to NTFY_TOPIC. On the public ntfy.sh server anyone who knows the
// topic can read it, so the topic must be long and random, and the message carries only a
// first name, dates and party size; everything else stays behind the house password.
// APP_URL (e.g. https://mission-control.example.com) makes the notification open the application.

const NTFY_SERVER = "https://ntfy.sh";

type Notifiable = Pick<Application, "id" | "name" | "arrivalDate" | "departureDate" | "partySize">;

export function newApplicationMessage(app: Notifiable, appUrl: string | undefined) {
  const firstName = app.name.trim().split(/\s+/)[0];
  const click = appUrl && `${appUrl.replace(/\/$/, "")}/dashboard/applications/${app.id}`;
  return {
    title: "New guest application",
    message: `${firstName}, ${formatDate(app.arrivalDate)} to ${formatDate(app.departureDate)}, ${formatPartySize(app.partySize)}`,
    tags: ["postbox"],
    ...(click && { click, actions: [{ action: "view", label: "Open", url: click }] }),
  };
}

export async function notifyNewApplication(app: Notifiable) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  const response = await fetch(NTFY_SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, ...newApplicationMessage(app, process.env.APP_URL) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ntfy responded ${response.status}: ${await response.text()}`);
}
