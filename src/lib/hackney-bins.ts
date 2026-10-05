// Reads the house's bin collection dates from the API behind Hackney's "check your collection
// day" page. It isn't a published API, so it may change without notice; the dashboard keeps the
// link to Hackney's own page as a fallback.
// Needs HACKNEY_BIN_PROPERTY_ID: the property's systemId, found once by POSTing
// {"Postcode": "..."} to `${API}/property/opensearch` and picking the house from addressSummaries.

const API = "https://waste-api-hackney-live.ieg4.net/f806d91c-e133-43a6-ba9a-c0ae4f4cccf6";

export type BinSchedule = { name: string; dates: string[] };
export type Collection = { date: string; bins: string[] };

export type BinCollections =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ok"; collections: Collection[] };

// Hackney's container names, e.g. "Recycling Sack ", "Food Caddy (Small) ", "Wheeled Bin (180ltr) "
export function binName(subTitle: string) {
  const name = subTitle.trim();
  if (/recycling/i.test(name)) return "Recycling";
  if (/food/i.test(name)) return "Food waste";
  if (/wheeled bin|refuse|rubbish/i.test(name)) return "Rubbish";
  return name;
}

// Dates come as UTC timestamps in the small hours, e.g. "2026-10-27T02:20:00Z"; the
// collection day is the London date.
const londonDate = (timestamp: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(timestamp));

// Groups each bin's dates into collection days from `today` onwards, soonest first.
export function upcomingCollections(schedules: BinSchedule[], today: string): Collection[] {
  const byDay = new Map<string, string[]>();
  for (const schedule of schedules) {
    for (const timestamp of schedule.dates) {
      const date = londonDate(timestamp);
      if (date < today) continue;
      const bins = byDay.get(date) ?? [];
      if (!bins.includes(schedule.name)) bins.push(schedule.name);
      byDay.set(date, bins);
    }
  }
  return [...byDay]
    .map(([date, bins]) => ({ date, bins }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function hackneyGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API}/alloywastepages/${path}`, {
    // Schedules are set weeks ahead, so twice a day is plenty
    next: { revalidate: 43200 },
  });
  if (!response.ok) throw new Error(`Hackney bins API returned ${response.status} for ${path.split("/")[0]}`);
  return response.json() as Promise<T>;
}

export async function getBinCollections(today: string): Promise<BinCollections> {
  const propertyId = process.env.HACKNEY_BIN_PROPERTY_ID;
  if (!propertyId) return { status: "not-configured" };

  try {
    const property = await hackneyGet<{ providerSpecificFields: Record<string, string> }>(
      `getproperty/${encodeURIComponent(propertyId)}`,
    );
    const binIds = (property.providerSpecificFields.attributes_wasteContainersAssignableWasteContainers ?? "")
      .split(",")
      .filter(Boolean);
    const schedules = await Promise.all(
      binIds.map(async (binId): Promise<BinSchedule> => {
        const [bin, collection] = await Promise.all([
          hackneyGet<{ subTitle: string }>(`getbin/${binId}`),
          hackneyGet<{ scheduleCodeWorkflowIDs: string[] }>(`getcollection/${binId}`),
        ]);
        const workflows = await Promise.all(
          collection.scheduleCodeWorkflowIDs.map((id) =>
            hackneyGet<{ trigger: { dates: string[] } }>(`getworkflow/${id}`),
          ),
        );
        return { name: binName(bin.subTitle), dates: workflows.flatMap((w) => w.trigger.dates) };
      }),
    );
    return { status: "ok", collections: upcomingCollections(schedules, today) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
