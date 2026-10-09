#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${POLATO_PRODUCTION_URL:-https://polatordsolar.davidebernardelli75.workers.dev}"
HEALTH_URL="${BASE_URL%/}/api/health"

fail() {
  echo "ERRORE: $*" >&2
  exit 1
}

info() {
  echo
  echo "==> $*"
}

command -v curl >/dev/null 2>&1 || fail "curl non trovato."

info "Verifica endpoint health"
health="$(curl --silent --show-error --fail   --max-time 20   --retry 2   --retry-delay 2   --header 'accept: application/json'   "$HEALTH_URL")"

printf '%s
' "$health"

printf '%s' "$health" | grep -q '"status":"ok"' || fail "Health status non OK."
printf '%s' "$health" | grep -q '"edge":"ok"' || fail "Edge status non OK."
printf '%s' "$health" | grep -q '"assets":"ok"' || fail "Assets status non OK."

info "Verifica security headers"
headers="$(curl --silent --show-error --fail   --max-time 20   --retry 2   --retry-delay 2   --dump-header -   --output /dev/null   "${BASE_URL%/}/")"

printf '%s
' "$headers"

printf '%s
' "$headers" | grep -qi '^content-security-policy:'   || fail "Content-Security-Policy assente."
printf '%s
' "$headers" | grep -qi '^strict-transport-security:'   || fail "HSTS assente."
printf '%s
' "$headers" | grep -qi '^x-frame-options:[[:space:]]*DENY'   || fail "X-Frame-Options non valido."
printf '%s
' "$headers" | grep -qi '^x-content-type-options:[[:space:]]*nosniff'   || fail "X-Content-Type-Options non valido."
printf '%s
' "$headers" | grep -qi '^permissions-policy:'   || fail "Permissions-Policy assente."
printf '%s
' "$headers" | grep -qi "^content-security-policy:.*frame-ancestors 'none'"   || fail "CSP frame-ancestors non valido."

echo
echo "PRODUZIONE VERIFICATA"
echo "URL: ${BASE_URL%/}"
echo "Health: OK"
echo "Security headers: OK"
