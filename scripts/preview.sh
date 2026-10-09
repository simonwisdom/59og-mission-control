#!/usr/bin/env bash
# Screenshot a logged-in dashboard page. Starts `next dev` on a free port,
# signs a session cookie with SESSION_SECRET from .env, saves a full-page PNG
# and stops the server.
#
#   scripts/preview.sh [PAGE] [OUT_PNG] [WIDTH]
#
# PAGE is under /dashboard: "/" (default) is the dashboard home, "/energy" is
# /dashboard/energy. WIDTH defaults to 1280; use 390 for a phone.
set -euo pipefail

page="${1:-/}"
out="${2:-${TMPDIR:-/tmp}/59og-preview.png}"
width="${3:-1280}"

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "No .env here; see CLAUDE.md (Worktrees)" >&2; exit 1; }

page="/${page#/}"
page="${page#/dashboard}"
url_path="/dashboard${page%/}"

port=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')
log="${TMPDIR:-/tmp}/59og-preview-$port.log"

node_modules/.bin/next dev -p "$port" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null; wait "$server" 2>/dev/null || true' EXIT

for _ in $(seq 60); do
  curl -s -o /dev/null "http://localhost:$port/login" && break
  kill -0 "$server" 2>/dev/null || { cat "$log" >&2; exit 1; }
  sleep 1
done

node --env-file=.env --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/preview-shot.mjs "http://localhost:$port$url_path" "$out" "$width"
