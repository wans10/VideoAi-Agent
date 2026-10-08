#!/usr/bin/env bash
set -euo pipefail
migration_database_url="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
migrations_dir="${MIGRATIONS_DIR:-/migrations}"
[[ -n "$migration_database_url" ]] || { echo 'A direct PostgreSQL DATABASE_URL is required.' >&2; exit 1; }
[[ -d "$migrations_dir" ]] || { echo 'Migration directory is missing.' >&2; exit 1; }
# Plan completely before connecting, so malformed files cannot partially execute.
plan_file="$(mktemp)"
trap 'rm -f "$plan_file"' EXIT
python3 "$(dirname "$0")/migration-plan.py" "$migrations_dir" "${1:-}" > "$plan_file"
psql "$migration_database_url" -X -v ON_ERROR_STOP=1 -f "$plan_file"
