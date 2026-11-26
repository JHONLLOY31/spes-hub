-- Add Personal Information Sheet (PIS) JSONB to profiles and admin-only journal points to journals.
alter table public.profiles
  add column if not exists pis jsonb;

alter table public.journals
  add column if not exists points_awarded int not null default 0 check (points_awarded >= 0),
  add column if not exists awarded_by text,
  add column if not exists awarded_at timestamptz;

notify pgrst, 'reload schema';
