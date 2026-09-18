#!/usr/bin/env bash
set -euo pipefail

database_url="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
migrations_dir="${MIGRATIONS_DIR:-/migrations}"

if [[ -z "$database_url" ]]; then
  echo "DATABASE_URL_UNPOOLED or DATABASE_URL is required." >&2
  exit 1
fi

if [[ ! -d "$migrations_dir" ]]; then
  echo "Migration directory does not exist: $migrations_dir" >&2
  exit 1
fi

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS application_schema_migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

while IFS= read -r -d '' migration; do
  filename="$(basename "$migration")"
  checksum="$(sha256sum "$migration" | awk '{print $1}')"
  applied_checksum="$(psql "$database_url" -At -v ON_ERROR_STOP=1 \
    -c "SELECT checksum FROM application_schema_migrations WHERE filename = '$filename'")"

  if [[ -n "$applied_checksum" ]]; then
    if [[ "$applied_checksum" != "$checksum" ]]; then
      echo "Refusing to rerun changed migration: $filename" >&2
      exit 1
    fi
    echo "Skipping already applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"
  psql "$database_url" -v ON_ERROR_STOP=1 -f "$migration"
  psql "$database_url" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO application_schema_migrations (filename, checksum) VALUES ('$filename', '$checksum')"
done < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

echo "Database migrations are current."
