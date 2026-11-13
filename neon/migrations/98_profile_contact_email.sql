begin;

-- Keyvo phone sign-up contact email (marketing and product notices). Not verified, not a login identity.
-- Nullable: existing profiles are unchanged. Idempotent: re-running adds nothing.
alter table profiles
  add column if not exists contact_email text,
  add column if not exists contact_email_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_contact_email_length_check') then
    alter table profiles
      add constraint profiles_contact_email_length_check
      check (contact_email is null or char_length(contact_email) between 3 and 254);
  end if;
end $$;

commit;
