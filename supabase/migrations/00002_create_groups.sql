-- =============================================================
-- Migration: 00002_create_groups.sql
-- Description: Create the groups and group_members tables with
--              indexes and an invite code generation function.
-- =============================================================

-- ----- Function: generate_invite_code -----
-- Produces a 12-character hex string from 6 random bytes.
-- Used as the default value for groups.invite_code.

create or replace function public.generate_invite_code()
returns varchar(20)
language sql
as $$
  select encode(gen_random_bytes(6), 'hex');
$$;

-- ----- Table DDL: groups -----

create table public.groups (
  id              uuid          primary key default gen_random_uuid(),
  name            varchar(100)  not null,
  description     varchar(500),
  category        varchar(20)   not null default 'other'
                    check (category in ('trip', 'home', 'couple', 'other')),
  currency        varchar(3)    not null default 'USD',
  invite_code     varchar(20)   unique not null default public.generate_invite_code(),
  is_archived     boolean       not null default false,
  is_pinned       boolean       not null default false,
  created_by      uuid          not null references public.profiles (id),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- Index on created_by for lookups by creator
create index idx_groups_created_by on public.groups (created_by);

-- ----- Table DDL: group_members -----

create table public.group_members (
  id              uuid          primary key default gen_random_uuid(),
  group_id        uuid          not null references public.groups (id) on delete cascade,
  user_id         uuid          not null references public.profiles (id) on delete cascade,
  role            varchar(10)   not null default 'member'
                    check (role in ('admin', 'member')),
  joined_at       timestamptz   not null default now(),

  unique (group_id, user_id)
);

-- Index on group_id for listing members of a group
create index idx_group_members_group_id on public.group_members (group_id);

-- Index on user_id for listing groups a user belongs to
create index idx_group_members_user_id on public.group_members (user_id);

-- ----- Row Level Security -----

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
