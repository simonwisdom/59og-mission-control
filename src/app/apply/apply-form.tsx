"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyState } from "./actions";

const initialState: ApplyState = { status: "idle" };

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, initialState);

  if (state.status === "submitted") {
    return (
      <div className="card text-center">
        <h2 className="text-xl font-semibold">Thanks, we&apos;ve got your application!</h2>
        <p className="mt-2 text-muted">
          The housemates will review it and get back to you by email.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};

  function field(
    name: keyof typeof errors,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    return (
      <label className="block">
        <span className="label">{label}</span>
        <input
          name={name}
          defaultValue={values[name]}
          aria-invalid={!!errors[name]}
          className="input"
          {...props}
        />
        {errors[name] && <span className="error">{errors[name]}</span>}
      </label>
    );
  }

  function area(name: keyof typeof errors, label: string, hint?: string, required = false) {
    return (
      <label className="block">
        <span className="label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
        <textarea
          name={name}
          rows={3}
          required={required}
          defaultValue={values[name]}
          aria-invalid={!!errors[name]}
          className="input"
        />
        {errors[name] && <span className="error">{errors[name]}</span>}
      </label>
    );
  }

  return (
    <form action={action} className="space-y-8" noValidate={false}>
      <fieldset className="card space-y-4">
        <legend className="legend">About you</legend>
        {field("name", "Full name", { required: true, autoComplete: "name" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("email", "Email", { type: "email", required: true, autoComplete: "email" })}
          {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
        </div>
        {field("pronouns", "Pronouns (optional)")}
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="legend">Your stay</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("arrivalDate", "Arrival", { type: "date", required: true })}
          {field("departureDate", "Departure", { type: "date", required: true })}
          {field("partySize", "Number of people", {
            type: "number",
            min: 1,
            max: 20,
            required: true,
            defaultValue: values.partySize ?? "1",
          })}
        </div>
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="legend">Getting to know you</legend>
        {area("about", "Tell us a bit about yourself", undefined, true)}
        {area("reason", "Why would you like to stay?", undefined, true)}
        {area("connection", "How do you know the house? (optional)", "e.g. a friend of a housemate")}
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="legend">House fit</legend>
        {area("dietaryNeeds", "Dietary needs (optional)")}
        {area("allergies", "Allergies (optional)")}
        {area("pets", "Bringing any pets? (optional)")}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="agreedToRules"
            required
            defaultChecked={values.agreedToRules === "on"}
            className="mt-1 size-4"
          />
          <span>I&apos;ve read and agree to follow the house rules.</span>
        </label>
        {errors.agreedToRules && <span className="error">{errors.agreedToRules}</span>}
      </fieldset>

      {/* Honeypot, hidden from people and screen readers */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {state.status === "error" && (
        <p className="error">Please fix the highlighted fields above.</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
