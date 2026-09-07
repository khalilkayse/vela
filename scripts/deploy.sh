#!/usr/bin/env bash
# Vela VPS deploy.
# Pulls the latest git, installs deps with Bun (or npm), applies every new
# file in migrations/, builds, and restarts the process.
#
# Usage (on the server):
#   cd /var/www/vela && bash scripts/deploy.sh
#
# Required env:
#   DATABASE_URL          Postgres connection string
#   BETTER_AUTH_SECRET    session signing secret
#   BETTER_AUTH_URL       public origin, e.g. https://vela.example.com
#
# Optional env:
#   APP_DIR               repo path (defaults to this script's parent)
#   PORT                  listen port (default 3000)
#   SERVICE_NAME          systemd unit to restart (default: vela)
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

log() { printf '\n[vela-deploy] %s\n' "$*"; }

if [ -d .git ]; then
  log "Pulling latest"
  git fetch --prune
  git pull --ff-only
fi

if ! command -v bun >/dev/null 2>&1; then
  log "Bun is recommended. Install from https://bun.sh then re-run."
  log "Falling back to npm for this deploy."
  RUNNER="npm"
else
  RUNNER="bun"
fi

log "Installing dependencies with ${RUNNER}"
if [ "$RUNNER" = "bun" ]; then
  bun install --frozen-lockfile || bun install
else
  npm ci || npm install
fi

log "Applying pending SQL migrations from migrations/"
# migrate.mjs records each filename in _migrations and only runs new files.
# Drop a new 0004_*.sql in migrations/ and the next deploy applies it.
if [ "$RUNNER" = "bun" ]; then
  bun run db:migrate
else
  npm run db:migrate
fi

log "Building (node-server preset for VPS)"
export NITRO_PRESET="${NITRO_PRESET:-node-server}"
if [ "$RUNNER" = "bun" ]; then
  bun run build:vps
else
  npm run build:vps
fi

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME:-vela}.service" >/dev/null 2>&1; then
  log "Restarting systemd unit ${SERVICE_NAME:-vela}"
  sudo systemctl restart "${SERVICE_NAME:-vela}"
  sudo systemctl --no-pager --full status "${SERVICE_NAME:-vela}" || true
elif command -v pm2 >/dev/null 2>&1; then
  log "Restarting pm2 process vela"
  pm2 restart vela || pm2 start .output/server/index.mjs --name vela
else
  log "Build complete. Start with: PORT=${PORT:-3000} bun .output/server/index.mjs"
fi

log "Done"
