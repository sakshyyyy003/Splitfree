-- =============================================================
-- Migration: 00016_fix_expense_rls_infinite_recursion.sql
-- Description: Break circular RLS dependency between expenses
--              and expense_splits tables that causes Postgres
--              error 42P17 (infinite recursion detected in policy).
--
-- Root cause:
--   expense_splits policies query expenses (triggering expenses
--   SELECT policy), which for direct expenses queries expense_splits
--   (triggering expense_splits SELECT policy), which queries
--   expenses again -> infinite loop.
--
-- Fix:
--   Create SECURITY DEFINER helper functions that read the
--   underlying tables without triggering RLS, then rewrite
--   the four affected policies to use these functions instead
--   of cross-table subqueries.
--
-- Affected policies:
--   1. expenses_select_policy
--   2. expense_splits_select_policy
--   3. expense_splits_insert_policy
--   4. expense_audit_log_select_policy
-- =============================================================

-- =============================================================
-- Helper Function: is_expense_split_participant
--
-- Returns TRUE if auth.uid() has a row in expense_splits for
-- the given expense. Used by expenses_select_policy so it can
-- check split participation WITHOUT querying expense_splits
-- through RLS (which would trigger expense_splits_select_policy
-- and start the recursion).
--
-- SECURITY DEFINER: bypasses RLS on expense_splits.
-- =============================================================

create or replace function public.is_expense_split_participant(_expense_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expense_splits
    where expense_id = _expense_id
    and user_id = (select auth.uid())
  );
$$;

-- =============================================================
-- Helper Function: is_expense_accessible
--
-- Returns TRUE if the given expense is accessible to auth.uid().
-- Checks:
--   - Group expense: user is a member of the expense's group
--   - Direct expense: user is the payer, creator, or a split
--     participant (checked via direct table scan, not RLS)
--
-- Used by expense_splits and expense_audit_log policies so
-- they can verify expense access WITHOUT triggering
-- expenses_select_policy (which would start the recursion).
--
-- SECURITY DEFINER: bypasses RLS on expenses and expense_splits.
-- =============================================================

create or replace function public.is_expense_accessible(_expense_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expenses e
    where e.id = _expense_id
    and (
      -- Group expense: delegate to existing is_group_member
      (e.group_id is not null and public.is_group_member(e.group_id))
      -- Direct expense: payer or creator
      or (e.group_id is null and e.paid_by = (select auth.uid()))
      or (e.group_id is null and e.created_by = (select auth.uid()))
      -- Direct expense: split participant (direct table scan, no RLS)
      or (
        e.group_id is null
        and exists (
          select 1 from public.expense_splits es
          where es.expense_id = e.id
          and es.user_id = (select auth.uid())
        )
      )
    )
  );
$$;

-- =============================================================
-- Helper Function: is_expense_owner_or_group_member
--
-- Returns TRUE if auth.uid() can insert splits for the given
-- expense. For group expenses, checks group membership. For
-- direct expenses, checks that the caller is the creator.
--
-- Used by expense_splits_insert_policy so it can verify
-- expense ownership WITHOUT triggering expenses_select_policy.
--
-- SECURITY DEFINER: bypasses RLS on expenses.
-- =============================================================

create or replace function public.is_expense_owner_or_group_member(_expense_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expenses e
    where e.id = _expense_id
    and (
      (e.group_id is not null and public.is_group_member(e.group_id))
      or (e.group_id is null and e.created_by = (select auth.uid()))
    )
  );
$$;

-- =============================================================
-- Rewrite Policy: expenses_select_policy
--
-- Before: inline subquery into expense_splits (triggered RLS)
-- After:  calls is_expense_split_participant() (bypasses RLS)
-- =============================================================

drop policy if exists expenses_select_policy on public.expenses;

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
        or public.is_expense_split_participant(id)
      )
    )
  );

-- =============================================================
-- Rewrite Policy: expense_splits_select_policy
--
-- Before: inline subquery into expenses (triggered RLS)
-- After:  calls is_expense_accessible() (bypasses RLS)
-- =============================================================

drop policy if exists expense_splits_select_policy on public.expense_splits;

create policy expense_splits_select_policy
  on public.expense_splits
  for select
  to authenticated
  using (
    public.is_expense_accessible(expense_id)
  );

-- =============================================================
-- Rewrite Policy: expense_splits_insert_policy
--
-- Before: inline subquery into expenses (triggered RLS)
-- After:  calls is_expense_owner_or_group_member() (bypasses RLS)
-- =============================================================

drop policy if exists expense_splits_insert_policy on public.expense_splits;

create policy expense_splits_insert_policy
  on public.expense_splits
  for insert
  to authenticated
  with check (
    public.is_expense_owner_or_group_member(expense_id)
  );

-- =============================================================
-- Rewrite Policy: expense_audit_log_select_policy
--
-- Before: inline subquery into expenses -> expense_splits chain
-- After:  calls is_expense_accessible() (bypasses RLS)
-- =============================================================

drop policy if exists expense_audit_log_select_policy on public.expense_audit_log;

create policy expense_audit_log_select_policy
  on public.expense_audit_log
  for select
  to authenticated
  using (
    public.is_expense_accessible(expense_id)
  );
