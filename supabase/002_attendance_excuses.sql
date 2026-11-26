-- Attendance excuses with optional +1 make-up workday support.
create table if not exists public.attendance_excuses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  date           date not null,
  category       text not null default 'Medical / Sick',
  reason         text not null,
  photo_path     text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  makeup_granted boolean not null default false,
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists attendance_excuses_user on public.attendance_excuses (user_id);

alter table public.attendance_excuses enable row level security;
revoke all on public.attendance_excuses from anon, authenticated;

notify pgrst, 'reload schema';
