"use client";

import { useActionState } from "react";
import { login } from "./actions";

// `next` is the page to return to after login; the action checks it's a dashboard path
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block">
        <span className="label">House password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="input"
        />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
