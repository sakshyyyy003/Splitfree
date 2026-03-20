-- =============================================================
-- Migration: 00007_create_update_expense_with_splits.sql
-- Description: Create the update_expense_with_splits RPC function
--              that atomically updates an expense and replaces
--              its splits within a single transaction.
-- =============================================================

-- =============================================================
-- Function: update_expense_with_splits
-- Atomically updates an expense and replaces its splits in a
-- single transaction. Uses optimistic locking via updated_at
-- comparison to prevent lost updates.
--
-- Uses SECURITY DEFINER so the function can delete and re-insert
-- expense_splits (no DELETE RLS policy exists for that table).
-- Manual auth.uid() check enforces authorization.
--
-- Does NOT insert into expense_audit_log — the existing
-- on_expense_change trigger handles that automatically.
-- =============================================================

create or replace function public.update_expense_with_splits(
  _expense_id          uuid,
  _expected_updated_at timestamptz,
  _expense_data        jsonb,
  _splits_data         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _expense    public.expenses%rowtype;
  _caller_id  uuid;
  _group_id   uuid;
  _splits_sum numeric(12, 2);
begin
  -- -------------------------------------------------------
  -- 1. Identify the calling user
  -- -------------------------------------------------------
  _caller_id := (select auth.uid());

  if _caller_id is null then
    raise exception 'Permission denied: not authenticated';
  end if;

  -- -------------------------------------------------------
  -- 2. Lock the expense row and verify optimistic lock
  --    SELECT ... FOR UPDATE acquires a row-level lock that
  --    prevents concurrent modifications until this
  --    transaction commits.
  -- -------------------------------------------------------
  select *
  into _expense
  from public.expenses
  where id = _expense_id
    and is_deleted = false
  for update;

  if not found then
    raise exception 'Expense not found or has been deleted';
  end if;

  if _expense.updated_at <> _expected_updated_at then
    raise exception 'Conflict: expense has been modified by another user';
  end if;

  -- -------------------------------------------------------
  -- 3. Authorization guard
  --    Only the expense creator or a group admin may update.
  --    This mirrors the expenses_update_policy RLS rule,
  --    which is bypassed by SECURITY DEFINER.
  -- -------------------------------------------------------
  _group_id := _expense.group_id;

  if _caller_id <> _expense.created_by then
    if _group_id is null
       or not public.is_group_admin(_group_id) then
      raise exception 'Permission denied: only the creator or a group admin can update this expense';
    end if;
  end if;

  -- -------------------------------------------------------
  -- 4. Validate that splits sum matches the expense amount
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
  -- 5. Update the expense row
  --    The moddatetime trigger will auto-set updated_at.
  -- -------------------------------------------------------
  update public.expenses
  set
    description     = coalesce(_expense_data ->> 'description', description),
    amount          = (_expense_data ->> 'amount')::numeric(12, 2),
    currency        = coalesce(_expense_data ->> 'currency', currency),
    date            = coalesce((_expense_data ->> 'date')::date, date),
    paid_by         = coalesce((_expense_data ->> 'paid_by')::uuid, paid_by),
    split_type      = coalesce(_expense_data ->> 'split_type', split_type),
    category        = coalesce(_expense_data ->> 'category', category),
    notes           = _expense_data ->> 'notes',
    image_url       = _expense_data ->> 'image_url',
    is_recurring    = coalesce((_expense_data ->> 'is_recurring')::boolean, is_recurring),
    recurrence_rule = _expense_data ->> 'recurrence_rule'
  where id = _expense_id
  returning * into _expense;

  -- -------------------------------------------------------
  -- 6. Replace splits: delete existing, insert new
  --    Simpler and safer than diffing individual rows.
  --    Atomic within this transaction.
  -- -------------------------------------------------------
  delete from public.expense_splits
  where expense_id = _expense_id;

  insert into public.expense_splits (expense_id, user_id, amount, share_value)
  select
    _expense_id,
    s.user_id,
    s.amount,
    s.share_value
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  -- -------------------------------------------------------
  -- 7. Return the updated expense as JSONB
  -- -------------------------------------------------------
  return to_jsonb(_expense);
end;
$$;
