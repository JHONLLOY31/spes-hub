-- SPES Hub database schema for Supabase (Postgres 17).
-- Safe to re-run (uses IF NOT EXISTS).
--
-- Security model: every table has Row Level Security ON with NO policies, and the anon /
-- authenticated roles have no grants. The browser never talks to Supabase directly; only the
-- Node server (using the secret key, which bypasses RLS) reads and writes, and it checks roles.

create table if not exists public.batches (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  name        text not null,
  year        int  not null,
  start_date  date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  spes_id     text unique,
  name        text not null,
  gender      text check (gender in ('Male', 'Female')),
  role        text not null check (role in ('admin', 'head', 'beneficiary')),
  batch_code  text references public.batches(code) on update cascade on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  start_date  date,
  avatar_path text,
  av_border   text,
  note        jsonb,
  settings    jsonb not null default '{}'::jsonb,
  seen        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));
create index if not exists profiles_batch on public.profiles (batch_code);

create table if not exists public.sessions (
  token_hash  text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  expires_at  timestamptz not null
);
create index if not exists sessions_user on public.sessions (user_id);

create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  slot         text not null check (slot in ('AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT')),
  date         date not null,
  photo_path   text,
  submitted_at timestamptz not null default now(),
  on_time      boolean not null default false,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  text,
  reviewed_at  timestamptz,
  unique (user_id, date, slot)
);
create index if not exists attendance_user on public.attendance (user_id);
create index if not exists attendance_date on public.attendance (date);

create table if not exists public.attendance_manual (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  marked_by  uuid,
  marked_at  timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.journals (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        int  not null check (day between 1 and 20),
  date       date not null,
  text       text not null default '',
  event      text not null default '',
  photos     text[] not null default '{}',
  status     text not null default 'draft' check (status in ('draft', 'submitted')),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  type       text not null default 'Special event',
  created_at timestamptz not null default now()
);
create index if not exists events_date on public.events (date);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  target     text not null default 'all',
  created_at timestamptz not null default now()
);

-- target: a profile id, 'staff', 'all' (every beneficiary) or 'batch:CODE'
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  target     text not null,
  text       text not null,
  kind       text not null default 'info',
  created_at timestamptz not null default now()
);
create index if not exists notifications_target on public.notifications (target, created_at desc);

create table if not exists public.activity (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_user on public.activity (user_id, created_at desc);

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  text       text not null,
  rating     int  not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists feedback_user on public.feedback (user_id);

create table if not exists public.game_progress (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  room     int  not null check (room between 0 and 19),
  got      int[] not null default '{}',
  done     boolean not null default false,
  correct  int not null default 0,
  wrong    int not null default 0,
  primary key (user_id, room)
);

create table if not exists public.points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total   int not null default 0 check (total >= 0)
);

create table if not exists public.presence (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now(),
  online    boolean not null default true
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Lock everything down: RLS on, no policies, no grants for browser roles.
do $$
declare t text;
begin
  foreach t in array array['batches','profiles','sessions','attendance','attendance_manual','journals','events',
                           'announcements','notifications','activity','feedback','game_progress','points','presence','app_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Private bucket for attendance, journal and profile photos (served only through the Node API).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Make the new tables visible to the API right away.
notify pgrst, 'reload schema';
