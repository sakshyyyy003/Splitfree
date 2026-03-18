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
