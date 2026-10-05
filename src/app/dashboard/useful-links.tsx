import Image from "next/image";
import {
  Bike,
  CalendarDays,
  Landmark,
  ListChecks,
  type LucideIcon,
  Recycle,
  Sofa,
  SquareParking,
  Ticket,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const HACKNEY = "https://www.hackney.gov.uk";
const BINS = `${HACKNEY}/rubbish-and-recycling/rubbish-recycling-and-food-waste-collections`;

// A link shows the company's logo (saved in public/links), a coloured initial
// when there's no usable logo, or a line icon for council tasks.
type Mark = { logo: string } | { initial: string; color: string } | { icon: LucideIcon };
type UsefulLink = { name: string; note: string; href: string | null; mark: Mark };

// Council tasks share one logo, so it sits by the heading and the tiles keep task icons
const groups: { title: string; logo?: string; links: UsefulLink[] }[] = [
  {
    title: "Accounts",
    links: [
      {
        name: "Sainsbury's",
        note: "Online shopping",
        href: "https://www.sainsburys.co.uk/gol-ui/groceries",
        mark: { logo: "/links/sainsburys.png" },
      },
      {
        name: "Octopus Energy",
        note: "Gas and electricity",
        href: "https://octopus.energy/dashboard/",
        mark: { logo: "/links/octopus.png" },
      },
      {
        name: "Thames Water",
        note: "Water",
        href: "https://www.thameswater.co.uk/login",
        mark: { logo: "/links/thames-water.png" },
      },
      {
        name: "Hyperoptic",
        note: "Internet",
        href: "https://account.hyperoptic.com/",
        mark: { logo: "/links/hyperoptic.png" },
      },
      {
        name: "Michael Morris",
        note: "Estate agent portal",
        href: null,
        mark: { initial: "M", color: "#4f6380" },
      },
    ],
  },
  {
    title: "Bins and recycling",
    logo: "/links/hackney.png",
    links: [
      { name: "Order recycling bags", note: "And food caddies, free", href: `${BINS}/order-bins-and-bags`, mark: { icon: Recycle } },
      { name: "Collection day", note: "Check which day", href: `${BINS}/check-your-collection-day`, mark: { icon: CalendarDays } },
      { name: "Missed collection", note: "Report after 6pm", href: `${BINS}/report-missed-collection`, mark: { icon: Trash2 } },
      {
        name: "Bulky waste",
        note: "Book a furniture pickup",
        href: `${HACKNEY}/rubbish-and-recycling/bulky-waste-collections/book-bulky-waste-collection`,
        mark: { icon: Sofa },
      },
      { name: "Which bin?", note: "What goes where", href: `${BINS}/what-bins-and-collections-you-get`, mark: { icon: ListChecks } },
    ],
  },
  {
    title: "Hackney Council",
    logo: "/links/hackney.png",
    links: [
      {
        name: "Parking permits",
        note: "Resident e-permits",
        href: "https://permits.hackney.gov.uk/control/applyPermitHackney",
        mark: { icon: SquareParking },
      },
      {
        name: "Visitor vouchers",
        note: "Parking for guests",
        href: `${HACKNEY}/parking-streets-and-transport/parking-permits-and-vouchers/street-resident-permits-and-vouchers/on-street-visitor-vouchers`,
        mark: { icon: Ticket },
      },
      { name: "Bike hangars", note: "Cycle lockers", href: "https://cyclehangars.hackney.gov.uk/sf/control/login", mark: { icon: Bike } },
      {
        name: "Council Tax",
        note: "Online account",
        href: `${HACKNEY}/council-tax-and-benefits/council-tax/your-online-council-tax-account`,
        mark: { icon: Landmark },
      },
      { name: "Report a problem", note: "Fly-tipping, potholes, lights", href: "https://reportaproblem.hackney.gov.uk/", mark: { icon: TriangleAlert } },
    ],
  },
];

function LinkMark({ mark }: { mark: Mark }) {
  if ("logo" in mark) {
    return <Image src={mark.logo} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full" />;
  }
  if ("initial" in mark) {
    return (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
        style={{ backgroundColor: mark.color }}
      >
        {mark.initial}
      </span>
    );
  }
  const Icon = mark.icon;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tile/10 text-tile">
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function UsefulLinks() {
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="hand mb-4 flex items-center gap-2 text-xl">
            {group.logo && <Image src={group.logo} alt="" width={24} height={24} className="size-6 rounded-full" />}
            {group.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.links.map((link) => {
              const body = (
                <>
                  <LinkMark mark={link.mark} />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {link.name}
                      {link.href && <span className="text-ink-soft"> ↗</span>}
                    </span>
                    <span className="block text-sm text-muted">{link.href ? link.note : `${link.note}: link to come`}</span>
                  </span>
                </>
              );
              return link.href ? (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card flex items-center gap-3 p-3 hover:border-accent"
                >
                  {body}
                </a>
              ) : (
                <div key={link.name} className="card flex items-center gap-3 p-3 opacity-60">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
