To see a logged-in page, run `scripts/preview.sh [PAGE] [OUT_PNG] [WIDTH]` (e.g. `scripts/preview.sh /energy out.png 390`): it starts its own dev server, logs in with a signed cookie, saves a screenshot and stops the server. Don't hand-roll Chrome calls or cookies.

@AGENTS.md

## Worktrees

`.env` and `AGENTS.md` are gitignored, so a fresh worktree doesn't have them. Claude Code copies them in automatically via `.worktreeinclude`. In a worktree made any other way (Codex, `git worktree add`), symlink them from the main checkout: `ln -s ../../../.env .env`. Run `npm ci` in each worktree; a symlinked `node_modules` crashes Turbopack. Use a free port, e.g. `npm run dev -- -p 3001`.

## Finishing a task

When a task is done, ship it and clean up without asking; Simon doesn't want to do these steps by hand. Pushing to main is the ship step: Railway deploys from it.

1. Run `npm run lint`, `npm test` and `npm run build`; all must pass. If one fails, stop and report instead of shipping.
2. Commit in the worktree, then `git fetch origin` and `git rebase origin/main`. If the rebase brought in new commits, run the checks again.
3. `git push origin HEAD:main`.
4. Leave and remove the worktree (Claude Code: ExitWorktree with `remove`; it asks to discard the commit because local `main` hasn't seen it yet, which is safe once it's on `origin/main`).
5. In the main checkout, `git pull --ff-only`. If that refuses, say why; don't force it.
6. Close out in a few lines: what changed, the commit hash, what was checked, and anything not checked (such as the live site).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
