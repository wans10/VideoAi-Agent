#!/usr/bin/env bash
set -euo pipefail

pnpm exec tsx --tsconfig frontend/tsconfig.json docker/scripts/bootstrap-schema.ts
exec docker/scripts/migrate.sh
