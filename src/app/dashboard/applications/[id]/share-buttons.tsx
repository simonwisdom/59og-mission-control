"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Application } from "@/db/schema";
import { formatForWhatsApp } from "@/lib/share-text";

type Props = {
  app: Pick<
    Application,
    "id" | "name" | "arrivalDate" | "departureDate" | "partySize" | "about" | "offering" | "connection" | "anythingElse"
  >;
};

type Feedback = { tone: "ok" | "error"; message: string } | null;

// Whether this browser has a share sheet (mostly phones). False while server rendering.
const noop = () => () => {};
function useCanShare() {
  return useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );
}

// Copy or share an application into the house WhatsApp. On phones, "Share…" opens the
// system share sheet with the postcard image and text; elsewhere, copy them separately.
export function ShareButtons({ app }: Props) {
  const imageUrl = `/dashboard/applications/${app.id}/postcard.png`;
  const fileName = `${app.name.replace(/[^\w-]+/g, "-").toLowerCase()}-postcard.png`;
  const [image, setImage] = useState<File | null>(null);
  const canShare = useCanShare();
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Fetch the image up front: mobile browsers only allow sharing straight from a tap,
  // so it has to be ready before the button is pressed.
  useEffect(() => {
    fetch(imageUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((blob) => setImage(new File([blob], fileName, { type: "image/png" })))
      .catch((error) => console.error("Could not load postcard image", error));
  }, [imageUrl, fileName]);

  function text() {
    return formatForWhatsApp(app, window.location.href);
  }

  function flash(next: Feedback) {
    setFeedback(next);
    setTimeout(() => setFeedback(null), 2500);
  }

  async function share() {
    const files = image ? [image] : [];
    const data = navigator.canShare?.({ files, text: text() }) ? { files, text: text() } : { text: text() };
    try {
      await navigator.share(data);
    } catch (error) {
      // Closing the share sheet isn't an error worth reporting.
      if ((error as DOMException).name !== "AbortError") {
        flash({ tone: "error", message: "Couldn't open sharing. Try copying instead." });
      }
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text());
      flash({ tone: "ok", message: "Text copied" });
    } catch {
      flash({ tone: "error", message: "Couldn't copy the text" });
    }
  }

  async function copyImage() {
    try {
      // Safari needs the ClipboardItem created synchronously in the tap, with a promise
      // for the data, so pass the fetch rather than awaiting it first.
      const blob = image
        ? Promise.resolve(image as Blob)
        : fetch(imageUrl).then((res) => res.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash({ tone: "ok", message: "Image copied" });
    } catch {
      flash({ tone: "error", message: "Couldn't copy the image. Try View image instead." });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="legend mr-1">Share with the house</span>
      {canShare && (
        <button type="button" onClick={share} className="btn-primary py-1.5 text-sm">
          Share…
        </button>
      )}
      <button type="button" onClick={copyText} className="btn-secondary">
        Copy text
      </button>
      <button type="button" onClick={copyImage} className="btn-secondary">
        Copy image
      </button>
      <a href={imageUrl} target="_blank" rel="noopener" className="btn-secondary">
        View image
      </a>
      <span
        aria-live="polite"
        className={`ml-1 text-sm ${feedback?.tone === "error" ? "text-danger" : "text-ink-soft"}`}
      >
        {feedback?.message}
      </span>
    </div>
  );
}
