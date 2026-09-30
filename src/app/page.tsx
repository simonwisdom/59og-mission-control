import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <p className="text-muted">Hoping to come and stay with us?</p>
      <Link href="/apply" className="btn-primary">Apply to stay</Link>
      <Link href="/login" className="text-sm text-muted hover:underline">Housemate login</Link>
    </main>
  );
}
