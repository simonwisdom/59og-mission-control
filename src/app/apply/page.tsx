import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import house from "../../../public/house.jpg";
import { Nameplate, SiteBar } from "../site-bar";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply to stay" };

export default function ApplyPage() {
  return (
    <>
      <SiteBar awning={false}>
        <Link href="/login" className="hover:underline">Housemates</Link>
      </SiteBar>

      {/* The nameplate mounted on the front of the house */}
      <header className="relative flex h-48 items-center justify-center px-5 sm:h-64">
        <Image
          src={house}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_28%]"
        />
        <div className="absolute inset-0 bg-black/10" />
        <Nameplate as="p" className="relative text-2xl sm:text-4xl" />
      </header>
      <div aria-hidden="true" className="awning h-3" />

      <main className="px-5 pt-12 pb-24">
        <div className="mx-auto max-w-[54rem]">
          <div className="mb-8 text-center">
            <h1 className="section-title text-3xl sm:text-4xl">Send us a postcard</h1>
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
