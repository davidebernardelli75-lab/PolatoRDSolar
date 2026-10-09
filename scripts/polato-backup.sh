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

info "Backup dati completi DB"
supabase db dump --linked -f "$DEST/db/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"

info "Backup Auth esplicito"
supabase db dump --linked -f "$DEST/db/auth_data.sql" --use-copy --data-only --schema auth
grep -q 'COPY "auth"."users"' "$DEST/db/auth_data.sql" \
  || fail "Il dump Auth non contiene auth.users."

info "Backup metadati Storage esplicito"
supabase db dump --linked -f "$DEST/db/storage_metadata.sql" --use-copy --data-only --schema storage \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"
grep -q 'COPY "storage"."buckets"' "$DEST/db/storage_metadata.sql" \
  || fail "Il dump Storage non contiene storage.buckets."
grep -q 'COPY "storage"."objects"' "$DEST/db/storage_metadata.sql" \
  || fail "Il dump Storage non contiene storage.objects."

info "Backup storico migration Supabase"
supabase db dump --linked -f "$DEST/db/history_schema.sql" --schema supabase_migrations
supabase db dump --linked -f "$DEST/db/history_data.sql" --use-copy --data-only --schema supabase_migrations

info "Backup Storage: solar-archive"
supabase storage cp -r ss:///solar-archive "$DEST/storage/solar-archive" \
  --experimental \
  --project-ref "$PROJECT_REF"

info "Backup Storage: quote-files"
supabase storage cp -r ss:///quote-files "$DEST/storage/quote-files" \
  --experimental \
  --project-ref "$PROJECT_REF"

info "Creazione manifest"
{
  echo "project_ref=$PROJECT_REF"
  echo "created_local=$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "created_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "git_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "supabase_cli=$(supabase --version 2>/dev/null || echo unknown)"
  echo "storage_solar_archive_files=$(find "$DEST/storage/solar-archive" -type f | wc -l | tr -d ' ')"
  echo "storage_quote_files_files=$(find "$DEST/storage/quote-files" -type f | wc -l | tr -d ' ')"
  echo "auth_selective_dump=yes"
  echo "storage_metadata_dump=yes"
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
echo "Auth: incluso e verificato"
echo "Storage metadata: incluso e verificato"
