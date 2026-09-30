"use client";

import { useActionState, useState } from "react";
import { submitApplication, type ApplyState } from "./actions";
import { Postmark, Stamp } from "./postcard-marks";

const initialState: ApplyState = { status: "idle" };

const HOUSE_RULES_URL =
  "https://bubble-grey-7c4.notion.site/Onboarding-229e679a2bcc81dd8951cdd99a1b8ab3";

// Stamp in the top-right corner with the postmark struck across its left edge.
function StampWithPostmark() {
  return (
    <div className="flex justify-end">
      <div className="relative">
        <Stamp />
        <Postmark className="absolute top-12 -left-24 w-44 -rotate-12 opacity-75" />
      </div>
    </div>
  );
}

// The form is the back of a postcard: a message side and an address side.
export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, initialState);
  const [partySize, setPartySize] = useState("1");

  if (state.status === "submitted") {
    return (
      <div className="postcard flex flex-col-reverse gap-8 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
        <div className="sm:pt-4">
          <h2 className="hand text-3xl">Posted!</h2>
          <p className="mt-2 max-w-sm text-ink-soft">
            Your postcard is on its way to the housemates. We&apos;ll write back by email.
          </p>
        </div>
        <StampWithPostmark />
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};
  const stayError = errors.arrivalDate ?? errors.departureDate ?? errors.partySize;

  return (
    <form action={action}>
      <div className="postcard grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Message side */}
        <div className="space-y-6 p-6 sm:p-8">
          <p className="hand text-2xl">Dear Olive Grove,</p>

          <label className="block">
            <span className="hint">Tell us a bit about yourself and your visit</span>
            <textarea
              name="about"
              rows={6}
              required
              defaultValue={values.about}
              aria-invalid={!!errors.about}
              className="ruled"
            />
            {errors.about && <span className="error">{errors.about}</span>}
          </label>

          <label className="block">
            <span className="hint">
              P.S. Anything we should know? Dietary needs, allergies, pets, accessibility…
              (optional)
            </span>
            <textarea
              name="anythingElse"
              rows={2}
              defaultValue={values.anythingElse}
              className="ruled"
            />
          </label>

          <label className="block">
            <span className="hand text-xl">Love,</span>
            <input
              name="name"
              required
              autoComplete="name"
              aria-label="Name"
              placeholder="your name"
              defaultValue={values.name}
              aria-invalid={!!errors.name}
              className="input font-hand text-2xl placeholder:text-rule"
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </label>
        </div>

        {/* Address side */}
        <div className="space-y-6 border-t-[1.5px] border-rule p-6 sm:p-8 md:border-t-0 md:border-l-[1.5px]">
          <StampWithPostmark />

          <p className="hand border-b-[1.5px] border-rule pb-1.5 text-lg">
            To: The Olive Grove, London
          </p>

          <label className="block">
            <span className="hint">Reply to (your email)</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={values.email}
              aria-invalid={!!errors.email}
              className="input"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </label>

          <label className="block">
            <span className="hint">Who do you know here? (optional)</span>
            <input name="connection" defaultValue={values.connection} className="input" />
          </label>

          <fieldset>
            <legend className="hint">Visiting</legend>
            <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2">
              <span>from</span>
              <input
                name="arrivalDate"
                type="date"
                required
                aria-label="Arrival date"
                defaultValue={values.arrivalDate}
                aria-invalid={!!errors.arrivalDate}
                className="input-inline text-left"
              />
              <span>to</span>
              <input
                name="departureDate"
                type="date"
                required
                aria-label="Departure date"
                defaultValue={values.departureDate}
                aria-invalid={!!errors.departureDate}
                className="input-inline text-left"
              />
              <span>with</span>
              <span className="flex items-baseline gap-2">
                <input
                  name="partySize"
                  type="number"
                  min={1}
                  max={20}
                  required
                  aria-label="Number of people"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  aria-invalid={!!errors.partySize}
                  className="input-inline w-14"
                />
                {partySize === "1" ? "person" : "people"}
              </span>
            </div>
            {stayError && <span className="error">{stayError}</span>}
          </fieldset>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="agreedToRules"
              required
              defaultChecked={values.agreedToRules === "on"}
              className="mt-1 size-4 accent-lamp"
            />
            <span>
              I have read the{" "}
              <a
                href={HOUSE_RULES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-brick decoration-2 underline-offset-4 hover:decoration-lamp"
              >
                onboarding doc
              </a>
              .
            </span>
          </label>
          {errors.agreedToRules && <span className="error">{errors.agreedToRules}</span>}
        </div>

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Posting…" : "Send postcard"}
        </button>
      </div>

      {/* Honeypot, hidden from people and screen readers */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
    </form>
  );
}
