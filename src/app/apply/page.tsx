import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply to stay" };

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-20 lg:pt-16">
      <header className="mb-10 max-w-2xl">
        <h1 className="hand text-4xl leading-tight sm:text-5xl">
          Come and stay at The Olive Grove
        </h1>
        <p className="mt-3 text-ink-soft">
          We love having guests. Send us a postcard (it takes about 2 minutes) and one of us
          will write back by email.
        </p>
      </header>

      <ApplyForm />
    </div>
  );
}
