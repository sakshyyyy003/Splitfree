-- =============================================================
-- Migration: 00004_create_settlements_friends.sql
-- Description: Create the settlements and friends tables with
--              indexes and RLS policies.
-- =============================================================

-- ----- Table DDL: settlements -----

create table public.settlements (
  id              uuid            primary key default gen_random_uuid(),
  group_id        uuid            references public.groups (id) on delete cascade,
  paid_by         uuid            not null references public.profiles (id),
  paid_to         uuid            not null references public.profiles (id),
  amount          numeric(12, 2)  not null check (amount > 0),
  notes           text,
  created_at      timestamptz     not null default now()
);

-- Index on group_id for listing settlements in a group
create index idx_settlements_group_id on public.settlements (group_id);

-- Index on paid_by for lookups by payer
create index idx_settlements_paid_by on public.settlements (paid_by);

-- Index on paid_to for lookups by payee
create index idx_settlements_paid_to on public.settlements (paid_to);

-- ----- Table DDL: friends -----

create table public.friends (
  id              uuid            primary key default gen_random_uuid(),
  user_id         uuid            not null references public.profiles (id),
  friend_id       uuid            not null references public.profiles (id),
  created_at      timestamptz     not null default now(),

  check (user_id <> friend_id),
  unique (user_id, friend_id)
);

-- Index on user_id for listing friends of a user
create index idx_friends_user_id on public.friends (user_id);

-- Index on friend_id for reverse lookups
create index idx_friends_friend_id on public.friends (friend_id);

-- ----- Row Level Security -----

alter table public.settlements enable row level security;
alter table public.friends enable row level security;

-- =============================================================
-- RLS Policies: settlements
-- No UPDATE/DELETE policies — settlements are write-once records.
-- =============================================================

-- Group members can view group settlements; for 1:1 settlements
-- the payer or payee can view them.
create policy settlements_select_policy
  on public.settlements
  for select
  to authenticated
  using (
    (group_id is not null and public.is_group_member(group_id))
    or paid_by = (select auth.uid())
    or paid_to = (select auth.uid())
  );

-- The payer or payee can record a settlement.
create policy settlements_insert_policy
  on public.settlements
  for insert
  to authenticated
  with check (
    paid_by = (select auth.uid())
    or paid_to = (select auth.uid())
  );

-- =============================================================
-- RLS Policies: friends
-- No UPDATE policy — friendships are not editable.
-- =============================================================

-- Users can view friendships they are part of.
create policy friends_select_policy
  on public.friends
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

-- Users can add friends (they must be the initiator).
create policy friends_insert_policy
  on public.friends
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Either party can remove the friendship.
create policy friends_delete_policy
  on public.friends
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );
