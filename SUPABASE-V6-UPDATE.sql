-- Harrold's Tree & Land Management - v6 update
-- Run this in Supabase SQL Editor if you already ran the permanent schema.

create table if not exists password_reset_requests (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table password_reset_requests enable row level security;

drop policy if exists "public_select" on password_reset_requests;
drop policy if exists "public_insert" on password_reset_requests;
drop policy if exists "public_update" on password_reset_requests;
drop policy if exists "public_delete" on password_reset_requests;
create policy "public_select" on password_reset_requests for select using (true);
create policy "public_insert" on password_reset_requests for insert with check (true);
create policy "public_update" on password_reset_requests for update using (true) with check (true);
create policy "public_delete" on password_reset_requests for delete using (true);

create index if not exists password_reset_record_user_idx on password_reset_requests ((record->>'username'));
