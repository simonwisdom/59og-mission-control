@AGENTS.md

## Worktrees

`.env` and `AGENTS.md` are gitignored, so a fresh worktree doesn't have them. Claude Code copies them in automatically via `.worktreeinclude`. In a worktree made any other way (Codex, `git worktree add`), symlink them from the main checkout: `ln -s ../../../.env .env`. Run `npm ci` in each worktree; a symlinked `node_modules` crashes Turbopack. Use a free port, e.g. `npm run dev -- -p 3001`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
