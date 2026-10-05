import Link from "next/link";
import { Nameplate, SiteBar } from "./site-bar";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteBar awning={false}>
        <Link href="/apply" className="hover:underline">Apply</Link>
        <Link href="/login" className="hover:underline">Housemates</Link>
      </SiteBar>
      {/* Awning stripes fill the page, with the nameplate on one white panel */}
      <main className="awning flex flex-1 items-center justify-center px-7 py-12">
        <div className="awning-panel w-full max-w-2xl px-6 py-12 text-center sm:px-12">
          <Nameplate className="text-3xl sm:text-5xl sm:whitespace-nowrap" />
          <p className="mt-8 text-lg">Hoping to come and stay with us?</p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/apply" className="btn-primary">Apply to stay →</Link>
            <Link href="/login" className="underline underline-offset-4 hover:text-pillar">
              Housemate login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
