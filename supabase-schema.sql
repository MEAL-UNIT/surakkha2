-- ============================================================
-- SURAKKHA Backend — Supabase Schema
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New Query → paste this → Run)
-- ============================================================

-- ---------------------------------------------------------------
-- 1. PROFILES — one row per registered user, linked to Supabase Auth
-- ---------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  designation text,
  organization text,
  phone text,
  whatsapp text,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  notes text
);

alter table profiles enable row level security;

-- Anyone who is logged in can read their own profile
create policy "read own profile" on profiles
  for select using (auth.uid() = id);

-- Admins can read every profile
create policy "admins read all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

-- A newly signed-up user may insert their own (pending) profile row once
create policy "insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Only admins can update role/status (approve, reject, promote)
create policy "admins update profiles" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

-- ---------------------------------------------------------------
-- 2. DASHBOARD ACTIVITIES — replaces dashboard-activities.csv
-- ---------------------------------------------------------------
create table if not exists dashboard_activities (
  id bigint generated always as identity primary key,
  quarter text,
  month text,
  activity_code text,
  activity_name text,
  targeted_group text,
  girls int default 0,
  boys int default 0,
  female int default 0,
  male int default 0,
  total int default 0,
  budget_status text,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table dashboard_activities enable row level security;

-- Any approved user (not just admins) can view activities
create policy "approved users read activities" on dashboard_activities
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.status = 'approved')
  );

-- Only admins can add/edit/delete activities
create policy "admins write activities" on dashboard_activities
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

-- ---------------------------------------------------------------
-- 3. PROGRESS — one row per user per topic, so completion is
--    remembered across logins and the final certificate can check
--    all six are done.
-- ---------------------------------------------------------------
create table if not exists progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  topic text not null,
  score int not null,
  passed boolean not null default true,
  completed_at timestamptz not null default now(),
  unique (user_id, topic)
);

alter table progress enable row level security;

-- Users can insert/update their own progress
create policy "users insert own progress" on progress
  for insert with check (auth.uid() = user_id);

create policy "users update own progress" on progress
  for update using (auth.uid() = user_id);

-- Users see their own progress; admins see everyone's
create policy "read progress" on progress
  for select using (
    auth.uid() = user_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

-- ---------------------------------------------------------------
-- 4. CERTIFICATES — one row per user, generated only once all six
--    topics in "progress" are complete (enforced in the app, not
--    the database, since checking "all six" is easier in JS).
-- ---------------------------------------------------------------
create table if not exists certificates (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  name_on_certificate text not null,
  topic text not null,
  score int not null,
  issued_at timestamptz not null default now()
);

alter table certificates enable row level security;

-- Users can record their own certificate when they pass
create policy "users insert own certificate" on certificates
  for insert with check (auth.uid() = user_id);

-- Users can see their own certificates; admins can see everyone's
create policy "read certificates" on certificates
  for select using (
    auth.uid() = user_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

-- ---------------------------------------------------------------
-- 5. NOTIFICATIONS — admin-posted updates, optionally sent to
--    everyone. notification_reads tracks who has seen each one.
-- ---------------------------------------------------------------
create table if not exists notifications (
  id bigint generated always as identity primary key,
  message text not null,
  notify_all boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- Any approved user can read notifications
create policy "approved users read notifications" on notifications
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.status = 'approved')
  );

-- Only admins can post notifications
create policy "admins insert notifications" on notifications
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved')
  );

create table if not exists notification_reads (
  id bigint generated always as identity primary key,
  notification_id bigint references notifications(id) on delete cascade,
  user_id uuid references auth.users(id),
  read_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

alter table notification_reads enable row level security;

-- Users can mark things as read for themselves only
create policy "users insert own read receipts" on notification_reads
  for insert with check (auth.uid() = user_id);

-- Users can see their own read receipts (to know what's unread)
create policy "users read own read receipts" on notification_reads
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 6. First admin account
-- After you sign up through register.html with your own account,
-- run this once (replace the email) to make yourself an admin:
--
--   update profiles set role = 'admin', status = 'approved'
--   where email = 'your-email@example.com';
-- ---------------------------------------------------------------
