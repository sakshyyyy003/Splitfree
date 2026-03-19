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

-- =============================================================
-- SECURITY DEFINER Helper Functions
-- These bypass RLS to prevent infinite recursion when
-- group_members policies reference the group_members table.
-- =============================================================

-- Check if the current user is a member of the given group.
create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id
    and user_id = (select auth.uid())
  );
$$;

-- Check if the current user is an admin of the given group.
create or replace function public.is_group_admin(_group_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id
    and user_id = (select auth.uid())
    and role = 'admin'
  );
$$;

-- =============================================================
-- RLS Policies: groups
-- =============================================================

-- Members can view groups they belong to.
create policy groups_select_policy
  on public.groups
  for select
  to authenticated
  using (public.is_group_member(id));

-- Authenticated users can create groups (creator must be themselves).
create policy groups_insert_policy
  on public.groups
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- Only group admins can update a group.
create policy groups_update_policy
  on public.groups
  for update
  to authenticated
  using (public.is_group_admin(id));

-- Only group admins can delete a group.
create policy groups_delete_policy
  on public.groups
  for delete
  to authenticated
  using (public.is_group_admin(id));

-- =============================================================
-- RLS Policies: group_members
-- =============================================================

-- Members can view all members in groups they belong to.
create policy group_members_select_policy
  on public.group_members
  for select
  to authenticated
  using (public.is_group_member(group_id));

-- Only group admins can add members.
create policy group_members_insert_policy
  on public.group_members
  for insert
  to authenticated
  with check (public.is_group_admin(group_id));

-- Admins can remove any member; members can remove themselves.
create policy group_members_delete_policy
  on public.group_members
  for delete
  to authenticated
  using (
    public.is_group_admin(group_id)
    or user_id = (select auth.uid())
  );

-- =============================================================
-- Trigger: updated_at auto-update for groups
-- Uses the moddatetime extension (enabled in 00001_create_profiles.sql)
-- to set updated_at = now() on every row update.
-- =============================================================

create trigger handle_groups_updated_at
  before update on public.groups
  for each row
  execute procedure extensions.moddatetime(updated_at);
