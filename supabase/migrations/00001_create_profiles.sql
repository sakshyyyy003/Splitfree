-- =============================================================
-- Migration: 00001_create_profiles.sql
-- Description: Create the profiles table that extends auth.users
--              with app-specific fields.
-- =============================================================

-- Enable the moddatetime extension (used by the updated_at trigger added later in this file)
create extension if not exists moddatetime schema extensions;

-- ----- Table DDL -----

create table public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       varchar(255)  not null,
  name        varchar(100)  not null,
  avatar_url  varchar(500),
  description varchar(500),
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

-- Index on email for profile search/lookup
create index idx_profiles_email on public.profiles (email);

-- ----- Row Level Security -----

alter table public.profiles enable row level security;

-- ----- Trigger Function: handle_new_user -----
-- Automatically creates a profile row when a new user signs up.
-- Extracts name and avatar_url from the OAuth/signup metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- ----- Trigger: on_auth_user_created -----

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ----- RLS Policies -----

-- Any authenticated user can read any profile (for displaying group members, etc.)
create policy profiles_select_policy
  on public.profiles
  for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy profiles_update_policy
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- ----- Trigger: updated_at auto-update -----
-- Uses the moddatetime extension (enabled above) to set updated_at = now()
-- on every row update.

create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute procedure extensions.moddatetime(updated_at);
