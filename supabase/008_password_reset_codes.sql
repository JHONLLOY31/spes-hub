-- 008_password_reset_codes.sql — 6-digit email OTP codes for password reset
create table if not exists public.password_reset_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text,
  reset_token_hash text,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.password_reset_codes enable row level security;
revoke all on public.password_reset_codes from anon, authenticated;
