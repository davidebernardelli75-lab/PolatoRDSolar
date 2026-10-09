#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "ERRORE: $*" >&2
  exit 1
}

info() {
  echo
  echo "==> $*"
}

command -v git >/dev/null 2>&1 || fail "git non trovato."
command -v npm >/dev/null 2>&1 || fail "npm non trovato."
command -v npx >/dev/null 2>&1 || fail "npx non trovato."

branch="$(git branch --show-current)"
[ "$branch" = "main" ] || fail "Il repository deve essere sul branch main."

git diff --quiet || fail "Ci sono modifiche locali tracked non salvate."
git diff --cached --quiet || fail "Ci sono modifiche staged non salvate."

info "Allineamento main"
git fetch origin main
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/main)"
[ "$local_sha" = "$remote_sha" ] || fail "La main locale non coincide con origin/main. Esegui polato-update e riprova."

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
[ "$node_major" -ge 22 ] || fail "Serve Node 22 o superiore."

info "Build produzione"
rm -rf dist
npm run build

[ -f dist/index.html ] || fail "dist/index.html non creato."
[ -f dist/_headers ] || fail "dist/_headers non creato."

info "Deploy Cloudflare Worker"
npx --yes wrangler@4.148.0 deploy

info "Verifica produzione"
bash scripts/polato-verify-production.sh
