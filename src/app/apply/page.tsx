import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply to stay" };

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold">Come and stay with us</h1>
      <p className="mt-2 mb-10 text-muted">
        We love having guests. This takes about 2 minutes, and the housemates will get back
        to you by email.
      </p>
      <ApplyForm />
    </main>
  );
}
