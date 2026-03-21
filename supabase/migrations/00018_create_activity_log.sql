-- =============================================================
-- Migration: 00018_create_activity_log.sql
-- Description: Create the activity_log table for the dashboard
--              activity feed. Includes DB triggers on expenses
--              and settlements for automatic event logging, a
--              back-fill trigger on expense_splits for direct
--              expense target resolution, and RLS policies.
-- =============================================================

-- ----- Table DDL: activity_log -----

create table public.activity_log (
  id              uuid            primary key default gen_random_uuid(),
  group_id        uuid            references public.groups (id) on delete cascade,
  actor_id        uuid            not null references public.profiles (id),
  action          varchar(30)     not null
                    check (action in (
                      'expense_created', 'expense_updated', 'expense_deleted',
                      'settlement_recorded',
                      'member_added', 'member_removed'
                    )),
  entity_type     varchar(20)     not null
                    check (entity_type in ('expense', 'settlement', 'member')),
  entity_id       uuid            not null,
  target_user_id  uuid            references public.profiles (id),
  metadata        jsonb           not null default '{}',
  created_at      timestamptz     not null default now()
);

-- ----- Indexes -----

create index idx_activity_log_actor_id
  on public.activity_log (actor_id);

create index idx_activity_log_target_user_id
  on public.activity_log (target_user_id)
  where target_user_id is not null;

create index idx_activity_log_group_id
  on public.activity_log (group_id)
  where group_id is not null;

create index idx_activity_log_created_at
  on public.activity_log (created_at desc);

create index idx_activity_log_entity
  on public.activity_log (entity_type, entity_id);

-- ----- Row Level Security -----

alter table public.activity_log enable row level security;

-- Users see activity from groups they belong to, or activity
-- where they are the actor or target (direct expenses/settlements).
-- No INSERT/UPDATE/DELETE policies — managed by SECURITY DEFINER
-- triggers and server actions.
create policy activity_log_select_policy
  on public.activity_log
  for select
  to authenticated
  using (
    (group_id is not null and public.is_group_member(group_id))
    or actor_id = (select auth.uid())
    or target_user_id = (select auth.uid())
  );

-- =============================================================
-- Trigger Function: handle_activity_log_expense
-- Records expense create, edit, and soft-delete events.
-- Runs as SECURITY DEFINER so the insert into activity_log
-- succeeds without a user-facing INSERT policy.
-- =============================================================

create or replace function public.handle_activity_log_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor    uuid;
  _action   varchar(30);
  _meta     jsonb;
  _target   uuid;
begin
  _actor := coalesce((select auth.uid()), coalesce(new.created_by, old.created_by));

  case tg_op
    when 'INSERT' then
      _action := 'expense_created';
      _meta   := jsonb_build_object(
        'description', new.description,
        'amount',      new.amount,
        'currency',    new.currency
      );
      -- target_user_id left NULL for direct expenses on INSERT;
      -- back-filled by the expense_splits trigger below.
      _target := null;

    when 'UPDATE' then
      -- Soft-delete → treat as expense_deleted
      if new.is_deleted = true and old.is_deleted = false then
        _action := 'expense_deleted';
        _meta   := jsonb_build_object(
          'description', old.description,
          'amount',      old.amount,
          'currency',    old.currency
        );
      else
        -- Skip if nothing meaningful changed (e.g. only updated_at)
        if old.description = new.description
          and old.amount    = new.amount
          and old.category  = new.category
          and old.date      = new.date
          and old.paid_by   = new.paid_by
          and old.is_deleted = new.is_deleted
        then
          return new;
        end if;

        _action := 'expense_updated';
        _meta   := jsonb_build_object(
          'description', new.description,
          'amount',      new.amount,
          'currency',    new.currency
        );

        -- Track what changed so the UI can show "amount changed from X to Y"
        if old.amount <> new.amount then
          _meta := _meta || jsonb_build_object('old_amount', old.amount);
        end if;
        if old.description <> new.description then
          _meta := _meta || jsonb_build_object('old_description', old.description);
        end if;
      end if;

      -- For updates on direct expenses, splits exist so we can
      -- resolve the target user.
      if coalesce(new.group_id, old.group_id) is null then
        select es.user_id into _target
        from public.expense_splits es
        where es.expense_id = coalesce(new.id, old.id)
          and es.user_id <> _actor
        limit 1;
      end if;
  end case;

  insert into public.activity_log
    (group_id, actor_id, action, entity_type, entity_id, target_user_id, metadata)
  values (
    coalesce(new.group_id, old.group_id),
    _actor,
    _action,
    'expense',
    coalesce(new.id, old.id),
    _target,
    _meta
  );

  return new;
end;
$$;

create trigger on_expense_activity
  after insert or update on public.expenses
  for each row
  execute function public.handle_activity_log_expense();

-- =============================================================
-- Trigger Function: handle_activity_log_backfill_target
-- When expense_splits are inserted for a direct (non-group)
-- expense, back-fills target_user_id on the matching
-- activity_log entry so RLS grants visibility to both parties.
-- =============================================================

create or replace function public.handle_activity_log_backfill_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only act on direct expenses (group_id IS NULL)
  if exists (
    select 1 from public.expenses
    where id = new.expense_id
      and group_id is null
  ) then
    update public.activity_log
    set target_user_id = new.user_id
    where entity_type = 'expense'
      and entity_id   = new.expense_id
      and target_user_id is null
      and actor_id <> new.user_id;
  end if;

  return new;
end;
$$;

create trigger on_expense_split_backfill_target
  after insert on public.expense_splits
  for each row
  execute function public.handle_activity_log_backfill_target();

-- =============================================================
-- Trigger Function: handle_activity_log_settlement
-- Records settlement creation events.
-- =============================================================

create or replace function public.handle_activity_log_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor  uuid;
  _target uuid;
begin
  _actor := coalesce((select auth.uid()), new.paid_by);

  -- Target is the other party in the settlement
  if _actor = new.paid_by then
    _target := new.paid_to;
  else
    _target := new.paid_by;
  end if;

  insert into public.activity_log
    (group_id, actor_id, action, entity_type, entity_id, target_user_id, metadata)
  values (
    new.group_id,
    _actor,
    'settlement_recorded',
    'settlement',
    new.id,
    _target,
    jsonb_build_object(
      'amount',   new.amount,
      'paid_by',  new.paid_by,
      'paid_to',  new.paid_to
    )
  );

  return new;
end;
$$;

create trigger on_settlement_activity
  after insert on public.settlements
  for each row
  execute function public.handle_activity_log_settlement();
