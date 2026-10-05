import type { Metadata } from "next";
import { Nameplate, SiteBar } from "../site-bar";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Housemate login" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteBar awning={false} />
      <main className="awning flex flex-1 items-center justify-center px-7 py-12">
        <div className="awning-panel w-full max-w-sm px-6 py-10 sm:px-10">
          <div className="text-center">
            <Nameplate as="p" className="text-xl sm:text-2xl" />
            <h1 className="hand mt-8 mb-6 text-xl">For housemates only</h1>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
