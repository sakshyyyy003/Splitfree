-- =============================================================
-- Migration: 00003_create_expenses.sql
-- Description: Create the expenses, expense_splits, and
--              expense_audit_log tables with indexes.
-- =============================================================

-- ----- Table DDL: expenses -----

create table public.expenses (
  id                uuid            primary key default gen_random_uuid(),
  group_id          uuid            references public.groups (id) on delete cascade,
  description       varchar(255)    not null,
  amount            numeric(12, 2)  not null check (amount > 0),
  currency          varchar(3)      not null default 'INR',
  date              date            not null default current_date,
  paid_by           uuid            not null references public.profiles (id),
  created_by        uuid            not null references public.profiles (id),
  split_type        varchar(20)     not null default 'equal'
                      check (split_type in ('equal', 'exact', 'percentage', 'shares')),
  category          varchar(30)     not null default 'other'
                      check (category in (
                        'food', 'transport', 'accommodation',
                        'entertainment', 'utilities', 'shopping', 'other'
                      )),
  image_url         varchar(500),
  notes             text,
  is_recurring      boolean         not null default false,
  recurrence_rule   varchar(50),
  is_deleted        boolean         not null default false,
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now()
);

-- Partial index on group_id for active (non-deleted) expenses
create index idx_expenses_group_id
  on public.expenses (group_id)
  where is_deleted = false;

-- Index on paid_by for lookups by payer
create index idx_expenses_paid_by on public.expenses (paid_by);

-- Index on date for chronological queries
create index idx_expenses_date on public.expenses (date);

-- Index on category for category-based filtering
create index idx_expenses_category on public.expenses (category);

-- ----- Table DDL: expense_splits -----

create table public.expense_splits (
  id              uuid            primary key default gen_random_uuid(),
  expense_id      uuid            not null references public.expenses (id) on delete cascade,
  user_id         uuid            not null references public.profiles (id),
  amount          numeric(12, 2)  not null check (amount >= 0),
  share_value     numeric(10, 4),
  is_settled      boolean         not null default false,
  created_at      timestamptz     not null default now(),

  unique (expense_id, user_id)
);

-- Index on expense_id for listing splits of an expense
create index idx_expense_splits_expense_id on public.expense_splits (expense_id);

-- Index on user_id for listing splits involving a user
create index idx_expense_splits_user_id on public.expense_splits (user_id);

-- ----- Table DDL: expense_audit_log -----

create table public.expense_audit_log (
  id              uuid            primary key default gen_random_uuid(),
  expense_id      uuid            not null references public.expenses (id) on delete cascade,
  changed_by      uuid            not null references public.profiles (id),
  action          varchar(20)     not null
                    check (action in ('created', 'updated', 'deleted')),
  old_values      jsonb,
  new_values      jsonb,
  created_at      timestamptz     not null default now()
);

-- Index on expense_id for listing audit entries of an expense
create index idx_expense_audit_log_expense_id on public.expense_audit_log (expense_id);

-- ----- Row Level Security -----

alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.expense_audit_log enable row level security;

-- =============================================================
-- RLS Policies: expenses
-- =============================================================

-- Members can view group expenses they belong to, or 1:1 expenses
-- they paid for or are split with.
create policy expenses_select_policy
  on public.expenses
  for select
  to authenticated
  using (
    (group_id is not null and public.is_group_member(group_id))
    or (
      group_id is null
      and (
        paid_by = (select auth.uid())
        or exists (
          select 1 from public.expense_splits
          where expense_splits.expense_id = expenses.id
          and expense_splits.user_id = (select auth.uid())
        )
      )
    )
  );

-- Group members can create group expenses; for 1:1 expenses the
-- creator must also be the payer.
create policy expenses_insert_policy
  on public.expenses
  for insert
  to authenticated
  with check (
    (
      group_id is not null
      and public.is_group_member(group_id)
      and created_by = (select auth.uid())
    )
    or (
      group_id is null
      and created_by = (select auth.uid())
      and paid_by = (select auth.uid())
    )
  );

-- Creators can update their own expenses; group admins can also
-- update any expense in their group.
create policy expenses_update_policy
  on public.expenses
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or (group_id is not null and public.is_group_admin(group_id))
  );

-- Creators can delete their own expenses; group admins can also
-- delete any expense in their group.
create policy expenses_delete_policy
  on public.expenses
  for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or (group_id is not null and public.is_group_admin(group_id))
  );

-- =============================================================
-- RLS Policies: expense_splits
-- =============================================================

-- Users can view splits for expenses they have access to.
-- No INSERT/UPDATE/DELETE policies — managed by service role/triggers.
create policy expense_splits_select_policy
  on public.expense_splits
  for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and (
        (expenses.group_id is not null and public.is_group_member(expenses.group_id))
        or (
          expenses.group_id is null
          and (
            expenses.paid_by = (select auth.uid())
            or expense_splits.user_id = (select auth.uid())
          )
        )
      )
    )
  );

-- =============================================================
-- RLS Policies: expense_audit_log
-- =============================================================

-- Users can view audit logs for expenses they have access to.
-- No INSERT/UPDATE/DELETE policies — managed by SECURITY DEFINER trigger.
create policy expense_audit_log_select_policy
  on public.expense_audit_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_audit_log.expense_id
      and (
        (expenses.group_id is not null and public.is_group_member(expenses.group_id))
        or (
          expenses.group_id is null
          and (
            expenses.paid_by = (select auth.uid())
            or exists (
              select 1 from public.expense_splits
              where expense_splits.expense_id = expenses.id
              and expense_splits.user_id = (select auth.uid())
            )
          )
        )
      )
    )
  );

-- =============================================================
-- Trigger: updated_at auto-update for expenses
-- Uses the moddatetime extension (enabled in 00001_create_profiles.sql)
-- to set updated_at = now() on every row update.
-- =============================================================

create trigger handle_expenses_updated_at
  before update on public.expenses
  for each row
  execute procedure extensions.moddatetime(updated_at);

-- =============================================================
-- Trigger Function: handle_expense_audit_log
-- Records every INSERT, UPDATE, and DELETE on the expenses table
-- into expense_audit_log.  Runs as SECURITY DEFINER so the
-- insert into the audit table succeeds even though regular users
-- have no direct write access to expense_audit_log.
-- =============================================================

create or replace function public.handle_expense_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _action     varchar(20);
  _old_values jsonb;
  _new_values jsonb;
begin
  case tg_op
    when 'INSERT' then
      _action     := 'created';
      _old_values := null;
      _new_values := to_jsonb(new);
    when 'UPDATE' then
      _action     := 'updated';
      _old_values := to_jsonb(old);
      _new_values := to_jsonb(new);
    when 'DELETE' then
      _action     := 'deleted';
      _old_values := to_jsonb(old);
      _new_values := null;
  end case;

  insert into public.expense_audit_log (expense_id, changed_by, action, old_values, new_values)
  values (
    coalesce(new.id, old.id),
    (select auth.uid()),
    _action,
    _old_values,
    _new_values
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- ----- Trigger: on_expense_change -----

create trigger on_expense_change
  after insert or update or delete on public.expenses
  for each row
  execute function public.handle_expense_audit_log();
