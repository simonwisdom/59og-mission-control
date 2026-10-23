// The dashboard's useful links, in one list: the dashboard shows them, and the bot feed gives them
// to Grovelet, so a housemate can ask it for one in a chat ("where do I report a leak?").

const HACKNEY = "https://www.hackney.gov.uk";
const BINS = `${HACKNEY}/rubbish-and-recycling/rubbish-recycling-and-food-waste-collections`;

// A link shows the company's logo (saved in public/links), a coloured initial when there's no
// usable logo, or a line icon for council tasks (its name in useful-links.tsx)
export type LinkMark = { logo: string } | { initial: string; color: string } | { icon: string };
export type UsefulLink = { name: string; note: string; href: string | null; mark: LinkMark };
export type LinkGroup = { title: string; logo?: string; links: UsefulLink[] };

// Council tasks share one logo, so it sits by the heading and each link keeps its task icon
export const linkGroups: LinkGroup[] = [
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
        note: "Report a maintenance problem, log in with the house Gmail and postcode",
        href: "https://crm.iamproperty.com/User/TenantLogin/9535B342-E379-41C7-939C-AB073541D9B5",
        mark: { initial: "M", color: "#4f6380" },
      },
    ],
  },
  {
    title: "Bins and recycling",
    logo: "/links/hackney.png",
    links: [
      { name: "Order recycling bags", note: "And food caddies, free", href: `${BINS}/order-bins-and-bags`, mark: { icon: "recycle" } },
      { name: "Collection day", note: "Check which day", href: `${BINS}/check-your-collection-day`, mark: { icon: "calendar" } },
      { name: "Missed collection", note: "Report after 6pm", href: `${BINS}/report-missed-collection`, mark: { icon: "trash" } },
      {
        name: "Bulky waste",
        note: "Book a furniture pickup",
        href: `${HACKNEY}/rubbish-and-recycling/bulky-waste-collections/book-bulky-waste-collection`,
        mark: { icon: "sofa" },
      },
      { name: "Which bin?", note: "What goes where", href: `${BINS}/what-bins-and-collections-you-get`, mark: { icon: "list" } },
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
        mark: { icon: "parking" },
      },
      {
        name: "Visitor vouchers",
        note: "Parking for guests",
        href: `${HACKNEY}/parking-streets-and-transport/parking-permits-and-vouchers/street-resident-permits-and-vouchers/on-street-visitor-vouchers`,
        mark: { icon: "ticket" },
      },
      { name: "Bike hangars", note: "Cycle lockers", href: "https://cyclehangars.hackney.gov.uk/sf/control/login", mark: { icon: "bike" } },
      {
        name: "Council Tax",
        note: "Online account",
        href: `${HACKNEY}/council-tax-and-benefits/council-tax/your-online-council-tax-account`,
        mark: { icon: "landmark" },
      },
      { name: "Report a problem", note: "Fly-tipping, potholes, lights", href: "https://reportaproblem.hackney.gov.uk/", mark: { icon: "alert" } },
    ],
  },
];
