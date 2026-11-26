-- Upgrade messages for Admin <-> Beneficiary chat, edit, unsend, reactions, and live typing indicator.
alter table public.messages
  alter column batch_code drop not null,
  add column if not exists edited_at timestamptz,
  add column if not exists unsent boolean not null default false,
  add column if not exists reactions jsonb not null default '{}'::jsonb;

alter table public.presence
  add column if not exists typing_to uuid,
  add column if not exists typing_at timestamptz;

notify pgrst, 'reload schema';
