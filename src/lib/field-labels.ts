// How application fields are labelled to housemates: on the review page,
// the shared postcard image and the WhatsApp text.
export const FIELD_LABELS = {
  dates: "Dates",
  partySize: "Group size",
  about: "About them and their visit",
  connection: "Who they know here",
  anythingElse: "Anything we should know",
} as const;

export function formatPartySize(partySize: number) {
  return partySize === 1 ? "1 person" : `${partySize} people`;
}

// The same fields in the guest's own voice, for the postcard image (it's from them).
export const POSTCARD_LABELS = {
  dates: "I'd like to stay",
  partySize: "How many of us",
  about: "About me and my visit",
  connection: "Who I know there",
  anythingElse: "Anything you should know",
} as const;
