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
  height text default '6''0"',
  weight text default '180 lbs',
  age integer default 25,
  hometown text default 'Ayala Alabang',
  photo_url text, -- Storage URL for face photo
  is_starter boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. GAMES TABLE
create table if not exists games (
  id text primary key,
  league_id text references leagues(id) on delete cascade,
  season text not null,
  home_team_id text references teams(id),
  away_team_id text references teams(id),
  home_score integer default 0,
  away_score integer default 0,
  quarter text default 'Q1',
  time_remaining_seconds integer default 600,
  is_clock_running boolean default false,
  status text default 'scheduled', -- 'scheduled', 'live', 'halftime', 'final'
  scheduled_at timestamp with time zone not null,
  venue text default 'Ayala Alabang Village Main Gym',
  home_fouls integer default 0,
  away_fouls integer default 0,
  home_timeouts integer default 4,
  away_timeouts integer default 4,
  possession text default 'neutral',
  officials text[] default array['R. Fernandez'],
  quarter_scores jsonb default '{"home": {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}, "away": {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. STAT_EVENTS TABLE (Real-time synced)
create table if not exists stat_events (
  id text primary key,
  game_id text references games(id) on delete cascade,
  team_id text references teams(id),
  player_id text references players(id),
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
  pin text default '1234',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Supabase Realtime on stat_events and games
alter publication supabase_realtime add table stat_events;
alter publication supabase_realtime add table games;

-- Row Level Security (RLS) policies
alter table leagues enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table stat_events enable row level security;
alter table staff_users enable row level security;

-- Allow public read on all data
create policy "Allow public read on all tables" on leagues for select using (true);
create policy "Allow public read on teams" on teams for select using (true);
create policy "Allow public read on players" on players for select using (true);
create policy "Allow public read on games" on games for select using (true);
create policy "Allow public read on stat_events" on stat_events for select using (true);
create policy "Allow public read on staff_users" on staff_users for select using (true);

-- Allow authenticated / staff operations
create policy "Allow staff insert on stat_events" on stat_events for all using (true);
create policy "Allow staff modify on games" on games for all using (true);
create policy "Allow admin full access" on teams for all using (true);
create policy "Allow admin full access players" on players for all using (true);
