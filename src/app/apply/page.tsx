import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply to stay" };

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Apply to stay with us</h1>
      <p className="mt-2 mb-8 text-muted">
        We love having guests. Tell us about yourself and your plans, and the housemates
        will review your application together.
      </p>
      <ApplyForm />
    </main>
  );
}
