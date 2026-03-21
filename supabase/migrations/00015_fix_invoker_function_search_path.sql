-- Fix SECURITY INVOKER functions: use search_path = 'public' instead of ''
--
-- SECURITY INVOKER functions run with the caller's privileges, so
-- search_path = '' provides no security benefit. However, RLS policy
-- expressions are evaluated with the function's search_path, meaning
-- unqualified references in policies may fail to resolve.
--
-- Setting search_path = 'public' prevents this class of failures.

-- Recreate create_expense_with_splits with search_path = 'public'
create or replace function public.create_expense_with_splits(
  _expense_data jsonb,
  _splits_data jsonb
)
returns jsonb
language plpgsql
set search_path = 'public'
as $$
declare
  _expense    public.expenses%rowtype;
  _splits_sum numeric(12, 2);
begin
  select coalesce(sum((s.amount)::numeric(12, 2)), 0)
  into _splits_sum
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  if _splits_sum <> (_expense_data ->> 'amount')::numeric(12, 2) then
    raise exception 'Splits sum (%) does not equal expense amount (%)',
      _splits_sum, (_expense_data ->> 'amount')::numeric(12, 2);
  end if;

  insert into public.expenses (
    group_id, description, amount, currency, date, paid_by, created_by,
    split_type, category, notes, image_url, is_recurring, recurrence_rule
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

  insert into public.expense_splits (expense_id, user_id, amount, share_value)
  select
    _expense.id,
    s.user_id,
    s.amount,
    s.share_value
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  return to_jsonb(_expense);
end;
$$;

-- Recreate create_direct_expense_with_splits with search_path = 'public'
create or replace function public.create_direct_expense_with_splits(
  _expense_data jsonb,
  _splits_data jsonb
)
returns jsonb
language plpgsql
set search_path = 'public'
as $$
declare
  _expense      public.expenses%rowtype;
  _splits_sum   numeric(12, 2);
  _splits_count int;
  _payer_id     uuid;
  _friend_id    uuid;
begin
  select count(*)
  into _splits_count
  from jsonb_array_elements(_splits_data);

  if _splits_count <> 2 then
    raise exception 'Direct expenses require exactly 2 participants, got %',
      _splits_count;
  end if;

  select coalesce(sum((s.amount)::numeric(12, 2)), 0)
  into _splits_sum
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

  if _splits_sum <> (_expense_data ->> 'amount')::numeric(12, 2) then
    raise exception 'Splits sum (%) does not equal expense amount (%)',
      _splits_sum, (_expense_data ->> 'amount')::numeric(12, 2);
  end if;

  insert into public.expenses (
    group_id, description, amount, currency, date, paid_by, created_by,
    split_type, category, notes, image_url, is_recurring, recurrence_rule
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

  insert into public.expense_splits (expense_id, user_id, amount, share_value)
  select
    _expense.id,
    s.user_id,
    s.amount,
    s.share_value
  from jsonb_to_recordset(_splits_data)
    as s(user_id uuid, amount numeric(12, 2), share_value numeric(10, 4));

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

  return to_jsonb(_expense);
end;
$$;
