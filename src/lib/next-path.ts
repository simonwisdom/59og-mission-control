// Where to send a housemate after login: the dashboard page they were trying to open, e.g.
// from a notification link. Only dashboard paths are allowed, so a crafted ?next= link can't
// send them to another site after they type the password.
export function safeNextPath(value: unknown) {
  if (typeof value === "string" && /^\/dashboard(?:[/?#]|$)/.test(value)) return value;
  return "/dashboard";
}
