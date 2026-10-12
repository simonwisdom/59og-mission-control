import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { logout } from "../login/actions";
import { SiteBar } from "../site-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen">
      <SiteBar home="/dashboard">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <form action={logout}>
          <button type="submit" className="cursor-pointer uppercase hover:underline">
            Log out
          </button>
        </form>
      </SiteBar>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
