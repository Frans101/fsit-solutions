-- FS IT Solutions Helpdesk V1. Run in Supabase SQL Editor.
-- This migration does not alter the six existing shop tables.
create extension if not exists pgcrypto;
create table if not exists public.helpdesk_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 ticket_no bigint generated always as identity unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 customer_name text not null check (char_length(customer_name) between 2 and 100),
 customer_email text not null check (char_length(customer_email) between 5 and 254),
 customer_phone text,
 category text not null check (category in ('Laptop / desktop repair','Networking & Wi-Fi','CCTV','Printer support','Software / email','Server / backup','Other IT support')),
 device text,
 description text not null check (char_length(description) between 10 and 3000),
 priority text not null default 'Normal' check (priority in ('Low','Normal','Urgent')),
 status text not null default 'New' check (status in ('New','Assigned','In progress','Waiting for customer','Resolved','Closed')),
 assigned_to uuid references auth.users(id) on delete set null,
 internal_notes text not null default '',
 source text not null default 'website' check (source in ('website','whatsapp','admin'))
);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
alter table public.helpdesk_admins enable row level security;
alter table public.support_tickets enable row level security;
revoke all on public.helpdesk_admins from anon, authenticated;
revoke all on public.support_tickets from anon, authenticated;
grant select on public.helpdesk_admins to authenticated;
grant select, update on public.support_tickets to authenticated;
-- No public read or insert. Public submissions use a validated Edge Function.
drop policy if exists "admins can see their role" on public.helpdesk_admins;
create policy "admins can see their role" on public.helpdesk_admins for select to authenticated
 using (user_id = (select auth.uid()));
drop policy if exists "admins read tickets" on public.support_tickets;
create policy "admins read tickets" on public.support_tickets for select to authenticated
 using (exists (select 1 from public.helpdesk_admins a where a.user_id = (select auth.uid())));
drop policy if exists "admins update tickets" on public.support_tickets;
create policy "admins update tickets" on public.support_tickets for update to authenticated
 using (exists (select 1 from public.helpdesk_admins a where a.user_id = (select auth.uid())))
 with check (exists (select 1 from public.helpdesk_admins a where a.user_id = (select auth.uid())));
-- Prevent browser admin users from changing identity/contact/description or claiming a ticket is from another source.
create or replace function public.helpdesk_guard_update() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.id is distinct from old.id or new.ticket_no is distinct from old.ticket_no
 or new.created_at is distinct from old.created_at or new.customer_name is distinct from old.customer_name
 or new.customer_email is distinct from old.customer_email or new.customer_phone is distinct from old.customer_phone
 or new.category is distinct from old.category or new.device is distinct from old.device
 or new.description is distinct from old.description or new.source is distinct from old.source then
   raise exception 'Ticket identity and customer details cannot be changed through this operation';
 end if;
 new.updated_at = now();
 return new;
end $$;
drop trigger if exists helpdesk_guard_update_trigger on public.support_tickets;
create trigger helpdesk_guard_update_trigger before update on public.support_tickets
for each row execute function public.helpdesk_guard_update();
-- After creating your admin account in Supabase Auth, grant access explicitly:
-- insert into public.helpdesk_admins(user_id) values ('YOUR_AUTH_USER_UUID');
