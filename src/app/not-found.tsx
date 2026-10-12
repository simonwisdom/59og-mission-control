import Link from "next/link";
import { Nameplate, SiteBar } from "./site-bar";

// Shown for any address that doesn't exist, including a deleted application
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteBar awning={false} />
      <main className="awning flex flex-1 items-center justify-center px-7 py-12">
        <div className="awning-panel w-full max-w-sm px-6 py-10 text-center sm:px-10">
          <Nameplate as="p" className="text-xl sm:text-2xl" />
          <h1 className="hand mt-8 text-xl">Nothing at this address</h1>
          <p className="mt-2 text-muted">The page may have moved, or been deleted.</p>
          <Link href="/" className="btn-primary mt-6">Back to the house →</Link>
        </div>
      </main>
    </div>
  );
}
