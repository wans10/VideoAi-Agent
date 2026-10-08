#!/usr/bin/env python3
"""Generate one psql session: serialize runners and atomically record each SQL file."""
import hashlib
import pathlib
import re
import sys
root = pathlib.Path(sys.argv[1])
concurrent = len(sys.argv) > 2 and sys.argv[2] == '--concurrent'
print('\\set ON_ERROR_STOP on\nSELECT pg_advisory_lock(19283746);')
print('CREATE TABLE IF NOT EXISTS application_schema_migrations(filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());')
print('CREATE TABLE IF NOT EXISTS application_schema_migration_reconciliations(filename text NOT NULL REFERENCES application_schema_migrations(filename), checksum text NOT NULL, previous_checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(filename,checksum));')
for path in sorted((root / 'concurrent' if concurrent else root).glob('*.sql')):
    name = ('concurrent/' if concurrent else '') + path.name
    if not re.fullmatch(r'(concurrent/)?[A-Za-z0-9_.-]+', name):
        raise ValueError('Invalid migration filename')
    raw = path.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    sql = raw.decode()
    if not concurrent:
        # Owned files use a single outer BEGIN/COMMIT pair. Nested DO bodies stay intact.
        if re.match(r'^\s*BEGIN;', sql, re.I):
            if not re.search(r'COMMIT;\s*$', sql, re.I):
                raise ValueError('Unbalanced migration transaction: ' + name)
            sql = re.sub(r'^\s*BEGIN;\s*', '', sql, count=1, flags=re.I)
            sql = re.sub(r'COMMIT;\s*$', '', sql, count=1, flags=re.I)
        if re.search(r'^\s*(BEGIN|COMMIT|ROLLBACK);', sql, re.M | re.I):
            raise ValueError('Unexpected transaction boundary: ' + name)
        print('BEGIN;')
    print(f"SELECT EXISTS(SELECT 1 FROM application_schema_migrations WHERE filename='{name}' AND checksum='{checksum}') OR EXISTS(SELECT 1 FROM application_schema_migration_reconciliations WHERE filename='{name}' AND checksum='{checksum}') AS applied \\gset")
    print('\\if :applied\n\\echo Skipping ' + name + '\n\\else')
    legacy = '3ff943b10bbbbef3e3e83eb4edabd10e755ba7a9a4a87e4188f477ce4b572139'
    approved = '4f681f3dc502a44c0f1c8ca49837061033f76efdf5d27f21ff3b492b2893ae55'
    allow = f" AND checksum <> '{legacy}'" if name == '31_mcp_trial_entitlements.sql' and checksum == approved else ''
    print(f"DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM application_schema_migrations WHERE filename='{name}'{allow}) THEN RAISE EXCEPTION 'Changed migration requires review: {name}'; END IF; END $guard$;")
    print('\\echo Applying ' + name)
    print(sql)
    # Retain the original historical ledger; record exact, actually executed reconciliation.
    print(f"INSERT INTO application_schema_migration_reconciliations(filename,checksum,previous_checksum) SELECT filename,'{checksum}',checksum FROM application_schema_migrations WHERE filename='{name}' ON CONFLICT DO NOTHING;")
    print(f"INSERT INTO application_schema_migrations(filename,checksum) VALUES('{name}','{checksum}') ON CONFLICT DO NOTHING;")
    print('\\endif')
    if not concurrent:
        print('COMMIT;')
print('SELECT pg_advisory_unlock(19283746);')
