-- Same-batch Messenger-style direct messages between approved SPES beneficiaries.
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  batch_code  text not null references public.batches(code) on update cascade on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists messages_batch_time on public.messages (batch_code, created_at desc);
create index if not exists messages_sender on public.messages (sender_id, created_at desc);
create index if not exists messages_receiver on public.messages (receiver_id, created_at desc);

alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;

notify pgrst, 'reload schema';
