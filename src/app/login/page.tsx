import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Housemate login" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold">Mission Control</h1>
      <p className="mb-6 text-sm text-muted">For housemates only.</p>
      <LoginForm />
    </main>
  );
}
