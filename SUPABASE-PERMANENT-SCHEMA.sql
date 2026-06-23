-- Harrold's Tree & Land Management - Permanent Database Schema
-- Run this ONCE in Supabase SQL Editor.
-- This creates long-term tables so app updates do not wipe business data.

create extension if not exists pgcrypto;

create table if not exists app_users (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimates (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists equipment (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists time_off_requests (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists password_reset_requests (
  id text primary key,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_name text,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

insert into app_users (id, record)
values
('owner-casey-royal', '{"id":"owner-casey-royal","username":"Casey.royal","name":"Casey.royal","role":"Owner","phone":"","password":"Temp1234","mustChangePassword":true,"protected":true,"notes":"Owner account."}'::jsonb),
('owner-lucas-harrold', '{"id":"owner-lucas-harrold","username":"Lucas.harrold","name":"Lucas.harrold","role":"Owner","phone":"","password":"Temp1234","mustChangePassword":true,"protected":true,"notes":"Owner account."}'::jsonb)
on conflict (id) do nothing;

insert into business_settings (key, value)
values
('businessName', 'Harrold''s Tree & Land Management'),
('phone', ''),
('email', ''),
('serviceArea', ''),
('notes', '')
on conflict (key) do nothing;

alter table app_users enable row level security;
alter table customers enable row level security;
alter table jobs enable row level security;
alter table estimates enable row level security;
alter table equipment enable row level security;
alter table time_off_requests enable row level security;
alter table password_reset_requests enable row level security;
alter table business_settings enable row level security;
alter table activity_log enable row level security;

-- Starter policies for your current private app link.
-- Later, when you want stronger security, we can replace these with Supabase Auth policies.
do $$
declare t text;
begin
  foreach t in array array['app_users','customers','jobs','estimates','equipment','time_off_requests','password_reset_requests','business_settings','activity_log'] loop
    execute format('drop policy if exists "public_select" on %I', t);
    execute format('drop policy if exists "public_insert" on %I', t);
    execute format('drop policy if exists "public_update" on %I', t);
    execute format('drop policy if exists "public_delete" on %I', t);
    execute format('create policy "public_select" on %I for select using (true)', t);
    execute format('create policy "public_insert" on %I for insert with check (true)', t);
    execute format('create policy "public_update" on %I for update using (true) with check (true)', t);
    execute format('create policy "public_delete" on %I for delete using (true)', t);
  end loop;
end $$;

create index if not exists jobs_record_date_idx on jobs ((record->>'date'));
create index if not exists time_off_record_employee_idx on time_off_requests ((record->>'employeeId'));
create index if not exists customers_record_name_idx on customers ((record->>'name'));
create index if not exists password_reset_record_user_idx on password_reset_requests ((record->>'username'));
create index if not exists activity_log_created_idx on activity_log (created_at desc);
