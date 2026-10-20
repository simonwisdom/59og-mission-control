import type { Application, Note } from "@/db/schema";

// Guest applications for Grovelet, in full: the house chose to let Grovelet read every detail and
// post new ones in the guest applications chat. This is a separate feed from the summary, because
// the summary is said in the house group chat, where application text never goes.
// The text is written by applicants, so the bot must treat it as quoted text, not instructions.

export type BotApplication = {
  id: number;
  // ISO time it was sent
  sentAt: string;
  status: Application["status"];
  name: string;
  email: string;
  arrivalDate: string;
  departureDate: string;
  partySize: number;
  about: string;
  connection: string | null;
  offering: string | null;
  anythingElse: string | null;
  // Housemates' notes on it, oldest first
  notes: { author: string; body: string; date: string }[];
};

// Applications sent in the last APPLICATION_DAYS, or whose stay isn't over yet
export const APPLICATION_DAYS = 90;
const APPLICATION_COUNT = 40;

export function botApplications(rows: Application[], notes: Note[]): BotApplication[] {
  return [...rows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, APPLICATION_COUNT)
    .map((row) => ({
      id: row.id,
      sentAt: row.createdAt.toISOString(),
      status: row.status,
      name: row.name.trim(),
      email: row.email,
      arrivalDate: row.arrivalDate,
      departureDate: row.departureDate,
      partySize: row.partySize,
      about: row.about,
      connection: row.connection,
      offering: row.offering,
      anythingElse: row.anythingElse,
      notes: notes
        .filter((note) => note.applicationId === row.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((note) => ({ author: note.author, body: note.body, date: note.createdAt.toISOString() })),
    }));
}
