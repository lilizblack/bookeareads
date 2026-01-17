-- Full Supabase Schema Migration
-- Creates reading_sessions, book_notes, and reading_goals tables
-- with proper RLS policies and cascading deletes

-- ============================================
-- 0. ENSURE BOOKS TABLE HAS REQUIRED COLUMNS
-- ============================================
-- Add any missing columns to books table first
alter table books add column if not exists started_at timestamp with time zone;
alter table books add column if not exists finished_at timestamp with time zone;
alter table books add column if not exists paused_at timestamp with time zone;
alter table books add column if not exists dnf_at timestamp with time zone;
alter table books add column if not exists updated_at timestamp with time zone default now();

-- ============================================
-- 1. READING SESSIONS TABLE
-- ============================================
create table if not exists reading_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  duration_minutes integer not null check (duration_minutes > 0),
  pages_read integer default 0,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_reading_sessions_user on reading_sessions(user_id);
create index if not exists idx_reading_sessions_book on reading_sessions(book_id);
create index if not exists idx_reading_sessions_date on reading_sessions(started_at);

-- Enable RLS
alter table reading_sessions enable row level security;

-- RLS Policies
create policy "Users can view own sessions"
  on reading_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on reading_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on reading_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on reading_sessions for delete
  using (auth.uid() = user_id);

-- ============================================
-- 2. BOOK NOTES TABLE
-- ============================================
create table if not exists book_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  content text not null,
  page_reference integer,
  is_private boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_book_notes_user on book_notes(user_id);
create index if not exists idx_book_notes_book on book_notes(book_id);

-- Enable RLS
alter table book_notes enable row level security;

-- RLS Policies
create policy "Users can manage own notes"
  on book_notes for all
  using (auth.uid() = user_id);

-- ============================================
-- 3. READING GOALS TABLE
-- ============================================
create table if not exists reading_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year integer not null,
  month integer check (month between 1 and 12),
  target_books integer default 0,
  target_pages integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, year, month)
);

-- Index
create index if not exists idx_reading_goals_user_year on reading_goals(user_id, year, month);

-- Enable RLS
alter table reading_goals enable row level security;

-- RLS Policies
create policy "Users can manage own goals"
  on reading_goals for all
  using (auth.uid() = user_id);

-- ============================================
-- 4. UPDATE BOOKS TABLE
-- ============================================
-- Add updated_at column if not exists
alter table books add column if not exists updated_at timestamp with time zone default now();

-- Create or replace trigger function for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists and recreate
drop trigger if exists update_books_updated_at on books;
create trigger update_books_updated_at
  before update on books
  for each row
  execute function update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the schema was created correctly:

-- Check tables exist
-- select table_name from information_schema.tables 
-- where table_schema = 'public' 
-- and table_name in ('reading_sessions', 'book_notes', 'reading_goals');

-- Check RLS is enabled
-- select tablename, rowsecurity from pg_tables 
-- where schemaname = 'public' 
-- and tablename in ('reading_sessions', 'book_notes', 'reading_goals');

-- Check policies
-- select tablename, policyname, cmd from pg_policies 
-- where tablename in ('reading_sessions', 'book_notes', 'reading_goals');

-- Check foreign keys and cascading
-- select 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name as foreign_table_name,
--   rc.delete_rule
-- from information_schema.table_constraints as tc 
-- join information_schema.key_column_usage as kcu
--   on tc.constraint_name = kcu.constraint_name
-- join information_schema.constraint_column_usage as ccu
--   on ccu.constraint_name = tc.constraint_name
-- join information_schema.referential_constraints as rc
--   on rc.constraint_name = tc.constraint_name
-- where tc.constraint_type = 'FOREIGN KEY' 
-- and tc.table_name in ('reading_sessions', 'book_notes', 'reading_goals');
