-- Run manually in Supabase SQL Editor after reviewing. This creates ONLY bot-specific tables.
create table if not exists public.whatsapp_processed_messages (
 message_id text primary key,
 phone_number text not null,
 received_at timestamptz not null default now()
);
create table if not exists public.whatsapp_conversations (
 phone_number text primary key,
 human_handover boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.whatsapp_processed_messages enable row level security;
alter table public.whatsapp_conversations enable row level security;
-- No anon/authenticated policies: only the Edge Function service role may access these tables.
revoke all on public.whatsapp_processed_messages from anon, authenticated;
revoke all on public.whatsapp_conversations from anon, authenticated;
create index if not exists whatsapp_processed_messages_received_at_idx on public.whatsapp_processed_messages(received_at);
