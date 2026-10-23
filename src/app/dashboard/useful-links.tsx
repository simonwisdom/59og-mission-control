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
import { type LinkMark as Mark, linkGroups } from "@/lib/useful-links";

// Each council task's icon, by the name in src/lib/useful-links.ts
const icons: Record<string, LucideIcon> = {
  recycle: Recycle,
  calendar: CalendarDays,
  trash: Trash2,
  sofa: Sofa,
  list: ListChecks,
  parking: SquareParking,
  ticket: Ticket,
  bike: Bike,
  landmark: Landmark,
  alert: TriangleAlert,
};

function LinkMark({ mark }: { mark: Mark }) {
  if ("logo" in mark) {
    return <Image src={mark.logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />;
  }
  if ("initial" in mark) {
    return (
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: mark.color }}
      >
        {mark.initial}
      </span>
    );
  }
  const Icon = icons[mark.icon];
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tile/10 text-tile">
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

// One card per group, side by side, each a list of its links
export function UsefulLinks() {
  return (
    <section className="mt-10">
      <h2 className="section-title mb-4">Useful links</h2>
      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
        {linkGroups.map((group) => (
          <div key={group.title} className="card border-2 border-ink/80 p-4">
            <h3 className="flex items-center gap-2.5">
              {group.logo && <Image src={group.logo} alt="" width={24} height={24} className="size-6 rounded-full" />}
              <span className="hand text-lg">{group.title}</span>
            </h3>
            <ul className="mt-2 divide-y divide-line">
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
                return (
                  <li key={link.name}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-2.5 hover:text-pillar"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 opacity-50">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
