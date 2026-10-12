import Link from "next/link";
import { CopyLink } from "./calendar/copy-link";

const NTFY_IOS = "https://apps.apple.com/gb/app/ntfy/id1625396347";
const NTFY_ANDROID = "https://play.google.com/store/apps/details?id=io.heckel.ntfy";

// What a housemate needs once per phone: alerts for new applications (src/lib/notify.ts)
// and a login link. Folded away by default, since each person needs it only once.
// The ntfy topic is shown only here, behind the login.
export function PhoneSetup() {
  const topic = process.env.NTFY_TOPIC;
  return (
    <details className="group card mt-8 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="hand text-base">Set up your phone</span>
          <span className="text-muted"> · alerts, login link</span>
        </span>
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 space-y-4 border-t border-line pt-3">
        <div>
          <h3 className="font-medium">Alerts for new applications</h3>
          {topic ? (
            <>
              <ol className="mt-1 list-decimal space-y-2 pl-5">
                <li>
                  Install the free ntfy app:{" "}
                  <a href={NTFY_IOS} target="_blank" rel="noopener noreferrer" className="underline hover:text-pillar">
                    iPhone ↗
                  </a>{" "}
                  or{" "}
                  <a href={NTFY_ANDROID} target="_blank" rel="noopener noreferrer" className="underline hover:text-pillar">
                    Android ↗
                  </a>
                </li>
                <li>
                  In the app, tap <b>+</b> and subscribe to the house topic:
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="rounded-[2px] border border-rule px-2 py-1 font-mono break-all">{topic}</code>
                    <CopyLink url={topic} label="Copy topic" />
                  </span>
                </li>
              </ol>
              <p className="mt-2 text-xs text-muted">
                Anyone who knows the topic can read the alerts, so keep it within the house. They only show a first
                name and dates. Mute or unsubscribe in the ntfy app. To change the topic, set a new{" "}
                <code>NTFY_TOPIC</code> on Railway; everyone then subscribes to the new one.
              </p>
            </>
          ) : (
            <p className="mt-1 text-muted">
              Alerts are off. Set <code>NTFY_TOPIC</code> on Railway to turn them on.
            </p>
          )}
        </div>
        <div>
          <h3 className="font-medium">Log in without the password</h3>
          <p className="mt-1 text-muted">
            Open the house login link once on each phone or laptop and you stay logged in.{" "}
            <Link href="/dashboard/login-links" className="underline hover:text-pillar">
              Make or manage login links
            </Link>
          </p>
        </div>
      </div>
    </details>
  );
}
