-- District 2 League (D2L) - Ayala Alabang Database Schema (Updated)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. LEAGUES & SEASONS TABLE
create table if not exists leagues (
  id text primary key,
  name text not null,
  season text not null,
  location text not null default 'Ayala Alabang Village Main Gym',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. TEAMS TABLE (with logo storage URL)
create table if not exists teams (
  id text primary key,
  league_id text references leagues(id) on delete cascade,
  name text not null,
  short_name text not null,
  logo text default '', -- Storage URL for PNG/JPG
  primary_color text default '#0B3B24',
  secondary_color text default '#D4AF37',
  wins integer default 0,
  losses integer default 0,
  points_for integer default 0,
  points_against integer default 0,
  streak text default '-',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. PLAYERS TABLE (with optional photo_url)
create table if not exists players (
  id text primary key,
  team_id text references teams(id) on delete cascade,
  jersey_number integer not null,
  name text not null,
  first_name text,
  last_name text,
  position text not null,
  photo_url text, -- Storage URL for face photo
  is_starter boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. GAMES TABLE
create table if not exists games (
  id text primary key,
  league_id text references leagues(id) on delete set null,
  season text not null,
  home_team_id text references teams(id) on delete cascade,
  away_team_id text references teams(id) on delete cascade,
  home_score integer default 0,
  away_score integer default 0,
  quarter text default 'Q1',
  status text default 'scheduled', -- 'scheduled', 'live', 'halftime', 'final', 'overtime'
  scheduled_at timestamp with time zone not null,
  venue text default 'Ayala Alabang Village Main Gym',
  home_fouls integer default 0,
  away_fouls integer default 0,
  officials text[] default array['R. Fernandez'],
  quarter_scores jsonb default '{"home": {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}, "away": {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}}'::jsonb,
  is_historical_import boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. STAT_EVENTS TABLE (Real-time synced)
create table if not exists stat_events (
  id text primary key,
  game_id text references games(id) on delete cascade,
  team_id text references teams(id) on delete cascade,
  player_id text references players(id) on delete cascade,
  quarter text not null,
  game_clock text not null,
  stat_type text not null,
  points integer default 0,
  assist_player_id text,
  block_player_id text,
  foul_on_player_id text,
  notes text,
  timestamp bigint not null,
  staff_name text,
  staff_role text check (staff_role in ('admin', 'staff')),
  synced boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. STAFF_USERS TABLE (2 Roles: 'admin' and 'staff')
create table if not exists staff_users (
  id text primary key,
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'staff')),
  pin_hash text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Shared active-game pointer so every device tracks the same matchup
alter table leagues add column if not exists active_game_id text;

create table if not exists app_state (
  id text primary key,
  active_game_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

insert into app_state (id, active_game_id)
values ('singleton', null)
on conflict (id) do nothing;

-- Enable Supabase Realtime on all shared league tables
do $$
begin
  begin
    alter publication supabase_realtime add table stat_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table games;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table teams;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table leagues;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table app_state;
  exception when duplicate_object then null;
  end;
end $$;

-- Row Level Security (RLS) policies
alter table leagues enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table stat_events enable row level security;
alter table staff_users enable row level security;
alter table app_state enable row level security;

-- Allow full read / write / delete access for authenticated users & service role
drop policy if exists "Allow public read on all tables" on leagues;
drop policy if exists "Allow public read on teams" on teams;
drop policy if exists "Allow public read on players" on players;
drop policy if exists "Allow public read on games" on games;
drop policy if exists "Allow public read on stat_events" on stat_events;
drop policy if exists "Allow public read on staff_users" on staff_users;

drop policy if exists "Allow staff insert on stat_events" on stat_events;
drop policy if exists "Allow staff modify on games" on games;
drop policy if exists "Allow admin full access" on teams;
drop policy if exists "Allow admin full access players" on players;

-- Comprehensive RLS policies (SELECT, INSERT, UPDATE, DELETE)
create policy "leagues_full_access" on leagues for all using (true) with check (true);
create policy "teams_full_access" on teams for all using (true) with check (true);
create policy "players_full_access" on players for all using (true) with check (true);
create policy "games_full_access" on games for all using (true) with check (true);
create policy "stat_events_full_access" on stat_events for all using (true) with check (true);
create policy "staff_users_full_access" on staff_users for all using (true) with check (true);
drop policy if exists "app_state_full_access" on app_state;
create policy "app_state_full_access" on app_state for all using (true) with check (true);
