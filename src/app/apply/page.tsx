import type { Metadata } from "next";
import Image from "next/image";
import house from "../../../public/house.jpg";
import { ApplyForm } from "./apply-form";
import { OliveBranch, OliveShadow } from "./olive-branch";

export const metadata: Metadata = { title: "Apply to stay" };

export default function ApplyPage() {
  return (
    <>
      <nav className="bg-card px-5 shadow-[0_1px_0_var(--rule)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center">
          <span className="font-sign text-sm font-bold tracking-[0.2em] uppercase">
            The Olive Grove
          </span>
        </div>
      </nav>

      {/* The street sign mounted on the front of the house */}
      <header className="relative flex h-48 flex-col items-center justify-center px-5 text-center sm:h-60">
        <Image
          src={house}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_28%]"
        />
        <div className="absolute inset-0 bg-black/15" />
        <p className="hand relative text-xl text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.7)] sm:text-2xl">
          Come and stay at
        </p>
        <h1 className="street-sign relative mt-3 text-2xl sm:text-3xl">The Olive Grove</h1>
      </header>

      <main className="relative overflow-hidden px-5 pt-10 pb-24">
        {/* Olive sprigs at the edges, and the shadow of the tree falling across the wall */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
          <OliveShadow className="absolute top-40 -left-24 w-[34rem] rotate-[25deg] opacity-[0.13]" />
          <OliveShadow className="absolute right-0 bottom-10 w-[30rem] -scale-x-100 rotate-[-20deg] opacity-[0.1]" />
          <OliveBranch className="absolute -top-2 -left-10 w-80 rotate-[20deg] drop-shadow-[6px_10px_6px_rgb(0_0_0/0.25)]" />
          <OliveBranch className="absolute -right-12 bottom-24 w-80 -scale-x-100 rotate-[-55deg] drop-shadow-[-6px_10px_6px_rgb(0_0_0/0.25)]" />
        </div>

        <div className="relative mx-auto max-w-[54rem]">
          <div className="mb-8 text-center">
            <h2 className="font-display text-4xl sm:text-5xl">Send us a postcard</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-soft">
              Tell us a bit about yourself and your visit.
            </p>
          </div>
          <ApplyForm />
        </div>
      </main>
    </>
  );
}
