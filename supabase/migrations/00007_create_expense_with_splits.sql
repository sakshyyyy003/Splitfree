-- =============================================================
-- Migration: 00006_create_expense_with_splits.sql
-- Description: Add INSERT RLS policy on expense_splits and
--              create the create_expense_with_splits RPC function.
-- =============================================================

-- =============================================================
-- RLS Policy: expense_splits INSERT
-- Allows a group member to insert splits for expenses that
-- belong to their group. For 1:1 (non-group) expenses the
-- creator (who is also the payer) can insert splits.
-- =============================================================

create policy expense_splits_insert_policy
  on public.expense_splits
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and (
        (expenses.group_id is not null and public.is_group_member(expenses.group_id))
        or (
          expenses.group_id is null
          and expenses.created_by = (select auth.uid())
        )
      )
    )
  );

-- =============================================================
-- Function: create_expense_with_splits
-- Atomically creates an expense and its splits in a single
-- transaction. Validates that split amounts sum to the expense
-- amount. Returns the created expense row as JSONB.
--
-- Uses SECURITY INVOKER (the default) so existing RLS policies
-- on expenses and expense_splits are enforced.
--
-- Does NOT insert into expense_audit_log — the existing
-- on_expense_change trigger handles that automatically.
-- =============================================================

create or replace function public.create_expense_with_splits(
  _expense_data jsonb,
  _splits_data jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  _expense    public.expenses%rowtype;
  _splits_sum numeric(12, 2);
begin
  -- -------------------------------------------------------
  -- 1. Validate that splits sum matches the expense amount
  --    before performing any inserts.
  -- -------------------------------------------------------
  select coalesce(sum((s.amount)::numeric(12, 2)), 0)
  into _splits_sum
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  if _splits_sum <> (_expense_data ->> 'amount')::numeric(12, 2) then
    raise exception 'Splits sum (%) does not equal expense amount (%)',
      _splits_sum, (_expense_data ->> 'amount')::numeric(12, 2);
  end if;

  -- -------------------------------------------------------
  -- 2. Insert the expense row.
  -- -------------------------------------------------------
  insert into public.expenses (
    group_id,
    description,
    amount,
    currency,
    date,
    paid_by,
    created_by,
    split_type,
    category,
    notes,
    image_url,
    is_recurring,
    recurrence_rule
  )
  values (
    (_expense_data ->> 'group_id')::uuid,
    _expense_data ->> 'description',
    (_expense_data ->> 'amount')::numeric(12, 2),
    coalesce(_expense_data ->> 'currency', 'INR'),
    coalesce((_expense_data ->> 'date')::date, current_date),
    (_expense_data ->> 'paid_by')::uuid,
    (_expense_data ->> 'created_by')::uuid,
    coalesce(_expense_data ->> 'split_type', 'equal'),
    coalesce(_expense_data ->> 'category', 'other'),
    _expense_data ->> 'notes',
    _expense_data ->> 'image_url',
    coalesce((_expense_data ->> 'is_recurring')::boolean, false),
    _expense_data ->> 'recurrence_rule'
  )
  returning * into _expense;

  -- -------------------------------------------------------
  -- 3. Insert the splits from the JSONB array.
  -- -------------------------------------------------------
  insert into public.expense_splits (expense_id, user_id, amount, share_value)
  select
    _expense.id,
    s.user_id,
    s.amount,
    s.share_value
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  -- -------------------------------------------------------
  -- 4. Return the created expense as JSONB.
  -- -------------------------------------------------------
  return to_jsonb(_expense);
end;
$$;
