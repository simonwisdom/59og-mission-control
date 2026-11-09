To see a page, run `scripts/preview.sh [PAGE] [OUT_PNG] [WIDTH] [SELECTOR]` (e.g. `scripts/preview.sh /energy out.png 390`, or `scripts/preview.sh /apply out.png 390 fieldset` to crop to one element): it starts its own dev server, logs in with a signed cookie, saves a screenshot and stops the server. Don't hand-roll Chrome calls or cookies. The local server uses a local copy of the database (Homebrew Postgres on this Mac), so test forms may be submitted locally; the live database is only on Railway. `scripts/db-target` answers "which database?" (host, port and name; agents can't read `.env`). To show data that isn't there yet, feed example rows in temporarily and take them out before committing.

To click through the site, run `npm run e2e [-- OUT_DIR]` (`scripts/e2e.mjs`): it starts its own dev server, logs in, loads every main page at phone width, checks booked nights can't be picked on /apply, sends a test application and checks it reaches the dashboard, then deletes its test rows and exits non-zero on any failure. Extend it for new pages and flows instead of writing a one-off script.

## Showing changes

Simon is a visual thinker. For any change to what the site looks like:

- Take a "before" screenshot before you edit and an "after" one once it works, at phone width (390) and cropped to the part that changed. Join them side by side, labelled, with `scripts/compare.sh before.png after.png out.png`, and show the picture with `decide status --picture`.
- If the change involves a look-and-feel choice Simon should weigh in on (a new layout, a new control, wording they'll see often), put the screenshots on a decide page and get Simon's feedback before shipping. Small or obvious visual fixes ship straight away, with the picture.

@AGENTS.md

## Worktrees

`.env` and `AGENTS.md` are gitignored, so a fresh worktree doesn't have them. Run `bin/setup` first in any new worktree: it links both from the main checkout when they're missing, runs `npm ci` (each worktree needs its own `node_modules`; a symlinked one crashes Turbopack) and `npx next typegen` (without it `tsc` fails on `RouteContext`, `LayoutProps` and image imports). It only does what's missing, and `bin/ship` runs it too. Use a free port, e.g. `npm run dev -- -p 3001`.

## Finishing a task

When a task is done, ship it and clean up without asking (except a look-and-feel choice that needs Simon's feedback first, see Showing changes); Simon doesn't want to do these steps by hand. Pushing to main is the ship step: Railway deploys from it, and `bin/ship` does it.

1. Commit in the worktree, then run plain `bin/ship` from the worktree (nothing before it: no `cd … &&`, no `VAR=…`). It queues behind any other ship, rebases onto `origin/main`, runs lint, tests and build, pushes to main, checks the live site answers, brings the main checkout up to date when it's clean, and deletes the branch. `bin/ship --check` does everything except the push. If it fails, it says what to do and whether main moved; fix that or stop and report.
2. Leave and remove the worktree: `wt-done <worktree path>`, or ExitWorktree with `remove`.
3. Close out in a few lines: what changed, the commit hash, what was checked, and anything not checked (Railway takes a few minutes to deploy, so the live site may still show the old version). For a visible change, include the before/after picture.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
