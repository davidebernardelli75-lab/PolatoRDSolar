#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${POLATO_PROJECT_REF:-fjmrfxjvqsdrwjucgzla}"
BACKUP_ROOT="${POLATO_BACKUP_ROOT:-$HOME/Desktop/Backup-Polato-Supabase}"
STAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
DEST="$BACKUP_ROOT/$STAMP"

fail() {
  echo "ERRORE: $*" >&2
  exit 1
}

info() {
  echo
  echo "==> $*"
}

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI non trovato."
command -v docker >/dev/null 2>&1 || fail "Docker CLI non trovato. Avvia Rancher Desktop."
docker info >/dev/null 2>&1 || fail "Docker non è attivo. Avvia Rancher Desktop e riprova."

umask 077
mkdir -p "$DEST/db" "$DEST/meta" "$DEST/storage/solar-archive" "$DEST/storage/quote-files"

info "Verifica collegamento Supabase"
supabase migration list --linked > "$DEST/meta/migrations.txt"

info "Backup ruoli database"
supabase db dump --linked -f "$DEST/db/roles.sql" --role-only

info "Backup schema applicativo"
supabase db dump --linked -f "$DEST/db/schema.sql"

info "Backup dati applicativi"
supabase db dump --linked -f "$DEST/db/data.sql" --use-copy --data-only   -x "storage.buckets_vectors"   -x "storage.vector_indexes"

info "Backup storico migration Supabase"
supabase db dump --linked -f "$DEST/db/history_schema.sql" --schema supabase_migrations
supabase db dump --linked -f "$DEST/db/history_data.sql" --use-copy --data-only --schema supabase_migrations

info "Backup Storage: solar-archive"
(
  cd "$DEST/storage/solar-archive"
  supabase storage cp -r ss:///solar-archive . --experimental --project-ref "$PROJECT_REF"
)

info "Backup Storage: quote-files"
(
  cd "$DEST/storage/quote-files"
  supabase storage cp -r ss:///quote-files . --experimental --project-ref "$PROJECT_REF"
)

if [ -n "${POLATO_DB_URL:-}" ]; then
  if command -v pg_dump >/dev/null 2>&1; then
    info "Backup completo critico public/auth/storage"
    pg_dump "$POLATO_DB_URL"       --no-owner       --no-privileges       --schema=public       --schema=auth       --schema=storage       --schema=supabase_migrations       --file="$DEST/db/full-critical.sql"
  else
    echo "AVVISO: POLATO_DB_URL è impostata ma pg_dump non è installato; full-critical.sql non creato." >&2
  fi
fi

info "Creazione manifest"
{
  echo "project_ref=$PROJECT_REF"
  echo "created_local=$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "created_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "git_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "supabase_cli=$(supabase --version 2>/dev/null || echo unknown)"
  echo "storage_solar_archive_files=$(find "$DEST/storage/solar-archive" -type f | wc -l | tr -d ' ')"
  echo "storage_quote_files_files=$(find "$DEST/storage/quote-files" -type f | wc -l | tr -d ' ')"
  if [ -f "$DEST/db/full-critical.sql" ]; then
    echo "full_critical_dump=yes"
  else
    echo "full_critical_dump=no"
  fi
} > "$DEST/meta/manifest.txt"

info "Calcolo checksum SHA-256"
(
  cd "$DEST"
  find db meta storage -type f ! -name 'checksums.sha256' -print0     | sort -z     | xargs -0 shasum -a 256 > checksums.sha256
  shasum -a 256 -c checksums.sha256
)

chmod -R go-rwx "$DEST"

echo
echo "BACKUP COMPLETATO"
echo "Percorso: $DEST"
echo "Verifica: OK"
echo
echo "Nota: full-critical.sql viene creato solo se POLATO_DB_URL è impostata e pg_dump è disponibile."
