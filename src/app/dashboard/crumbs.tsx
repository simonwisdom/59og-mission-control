import Link from "next/link";

// The way back up from a dashboard page, e.g. "Dashboard / Applications", always starting at the
// dashboard so every sub-page has one obvious route home
export function Crumbs({ trail = [] }: { trail?: { label: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      {[{ label: "Dashboard", href: "/dashboard" }, ...trail].map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          <Link href={crumb.href} className="hover:text-pillar hover:underline">
            {i === 0 && "← "}
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
