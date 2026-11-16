-- Account privacy audit trail (deletion request/cancel/purge, data export).
-- Additive and idempotent. Rows carry only the opaque user id and non-personal
-- detail; they are retained after the account is purged as proof of erasure.
create table if not exists account_privacy_events (
  id bigserial primary key,
  user_id text not null,
  event text not null check (event in (
    'deletion_requested', 'deletion_cancelled', 'export_generated', 'purged', 'purge_failed'
  )),
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_privacy_events_user_event_idx
  on account_privacy_events (user_id, event, created_at desc);

-- Purge candidates: cheap scan of the (small) set of flagged profiles.
create index if not exists profiles_marked_for_deletion_idx
  on profiles (marked_for_deletion_at)
  where marked_for_deletion_at is not null;
