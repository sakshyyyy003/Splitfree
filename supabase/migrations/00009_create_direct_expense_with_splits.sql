-- =============================================================
-- Migration: 00009_create_direct_expense_with_splits.sql
-- Description: Create the create_direct_expense_with_splits RPC
--              function for 1:1 (non-group) expenses. Also adds
--              a partial index to speed up direct expense queries.
-- =============================================================

-- =============================================================
-- Partial Index: idx_expenses_direct
-- Optimises queries that list direct (non-group) active expenses
-- for a given payer, ordered by date descending.
-- =============================================================

create index idx_expenses_direct
  on public.expenses (paid_by, date desc)
  where group_id is null and is_deleted = false;

-- =============================================================
-- Function: create_direct_expense_with_splits
-- Atomically creates a direct (1:1) expense with its splits and
-- inserts a friend row between the two participants.
--
-- Validations:
--   1. Exactly 2 splits (payer + friend)
--   2. group_id must be NULL (enforced by function, not caller)
--   3. Splits sum must equal the expense amount
--
-- Uses SECURITY INVOKER (the default) so existing RLS policies
-- on expenses, expense_splits, and friends are enforced.
--
-- Does NOT insert into expense_audit_log — the existing
-- on_expense_change trigger handles that automatically.
-- =============================================================

create or replace function public.create_direct_expense_with_splits(
  _expense_data jsonb,
  _splits_data jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  _expense      public.expenses%rowtype;
  _splits_sum   numeric(12, 2);
  _splits_count int;
  _payer_id     uuid;
  _friend_id    uuid;
begin
  -- -------------------------------------------------------
  -- 1. Validate exactly 2 participants in the splits array.
  -- -------------------------------------------------------
  select count(*)
  into _splits_count
  from jsonb_array_elements(_splits_data);

  if _splits_count <> 2 then
    raise exception 'Direct expenses require exactly 2 participants, got %',
      _splits_count;
  end if;

  -- -------------------------------------------------------
  -- 2. Validate that splits sum matches the expense amount.
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
  -- 3. Insert the expense row with group_id forced to NULL.
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
    null,
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
  -- 4. Insert the splits from the JSONB array.
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
  -- 5. Idempotently insert a friend row between the payer
  --    and the other participant. The friends table has a
  --    unique(user_id, friend_id) constraint, so ON CONFLICT
  --    DO NOTHING handles the case where they are already
  --    friends. The friends_insert_policy requires
  --    user_id = auth.uid(), which is satisfied because the
  --    payer (created_by) is always auth.uid() for direct
  --    expenses per the expenses_insert_policy.
  -- -------------------------------------------------------
  _payer_id := _expense.created_by;

  select s.user_id
  into _friend_id
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2))
  where s.user_id <> _payer_id
  limit 1;

  if _friend_id is not null then
    insert into public.friends (user_id, friend_id)
    values (_payer_id, _friend_id)
    on conflict (user_id, friend_id) do nothing;
  end if;

  -- -------------------------------------------------------
  -- 6. Return the created expense as JSONB.
  -- -------------------------------------------------------
  return to_jsonb(_expense);
end;
$$;
