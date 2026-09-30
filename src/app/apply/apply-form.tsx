"use client";

import { useActionState, useState } from "react";
import { submitApplication, type ApplyState } from "./actions";

const initialState: ApplyState = { status: "idle" };

const HOUSE_RULES_URL =
  "https://bubble-grey-7c4.notion.site/Onboarding-229e679a2bcc81dd8951cdd99a1b8ab3";

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, initialState);
  const [partySize, setPartySize] = useState("1");

  if (state.status === "submitted") {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold">Thanks, we&apos;ve got your application!</h2>
        <p className="mt-2 text-muted">
          The housemates will have a look and get back to you by email.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};
  const stayError = errors.arrivalDate ?? errors.departureDate ?? errors.partySize;

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            defaultValue={values.name}
            aria-invalid={!!errors.name}
            className="input"
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="label">Email</span>
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
      </div>

      <fieldset>
        <legend className="label">Your stay</legend>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <span>I&apos;d like to stay from</span>
          <input
            name="arrivalDate"
            type="date"
            required
            aria-label="Arrival date"
            defaultValue={values.arrivalDate}
            aria-invalid={!!errors.arrivalDate}
            className="input-inline"
          />
          <span>to</span>
          <input
            name="departureDate"
            type="date"
            required
            aria-label="Departure date"
            defaultValue={values.departureDate}
            aria-invalid={!!errors.departureDate}
            className="input-inline"
          />
          <span>with</span>
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
            className="input-inline w-16"
          />
          <span>{partySize === "1" ? "person" : "people"}.</span>
        </div>
        {stayError && <span className="error">{stayError}</span>}
      </fieldset>

      <label className="block">
        <span className="label">Tell us a bit about yourself and your visit</span>
        <textarea
          name="about"
          rows={4}
          required
          defaultValue={values.about}
          aria-invalid={!!errors.about}
          className="input"
        />
        {errors.about && <span className="error">{errors.about}</span>}
      </label>

      <label className="block">
        <span className="label">
          Who do you know here? <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="connection" defaultValue={values.connection} className="input" />
      </label>

      <label className="block">
        <span className="label">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </span>
        <span className="hint">Dietary needs, allergies, pets, accessibility…</span>
        <textarea name="anythingElse" rows={2} defaultValue={values.anythingElse} className="input" />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agreedToRules"
          required
          defaultChecked={values.agreedToRules === "on"}
          className="mt-1 size-4 accent-accent"
        />
        <span>
          I have read the{" "}
          <a
            href={HOUSE_RULES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            onboarding doc
          </a>
          .
        </span>
      </label>
      {errors.agreedToRules && <span className="error">{errors.agreedToRules}</span>}

      {/* Honeypot, hidden from people and screen readers */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
