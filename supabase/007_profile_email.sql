-- 007_profile_email.sql — Store verified beneficiary email on profiles for auth & notifications
alter table public.profiles
  add column if not exists email text;

-- Case-insensitive unique index on non-null emails
create unique index if not exists idx_profiles_email_lower
  on public.profiles (lower(email))
  where email is not null;

-- Backfill real (non-placeholder) emails from auth.users for existing accounts
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null
  and u.email not like '%@spes-hub.local';
