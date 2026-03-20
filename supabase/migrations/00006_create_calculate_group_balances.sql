-- =============================================================
-- Migration: 00006_create_calculate_group_balances.sql
-- Description: Create the calculate_group_balances function that
--              computes net balances and simplified debts for a
--              group using a greedy matching algorithm.
-- =============================================================

-- ----- Function: calculate_group_balances -----
-- Accepts a group_id and returns a jsonb object with two keys:
--   - balances:         array of {user_id, balance} objects
--   - simplified_debts: array of {from, to, amount} objects
--
-- Positive balance = member is owed money (creditor).
-- Negative balance = member owes money (debtor).
--
-- The greedy algorithm sorts creditors and debtors by absolute
-- amount descending and greedily matches the largest pairs to
-- minimise the number of transactions.

create or replace function public.calculate_group_balances(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Membership guard
  _is_member boolean;

  -- Balance computation
  _balances  jsonb;

  -- Simplified-debt algorithm working state
  _creditors numeric(12,2)[];
  _cred_ids  uuid[];
  _debtors   numeric(12,2)[];
  _debt_ids  uuid[];
  _row       record;
  _i         int;
  _j         int;
  _settle    numeric(12,2);
  _debts     jsonb := '[]'::jsonb;
begin
  -- -------------------------------------------------------
  -- 1. Membership guard
  --    SECURITY DEFINER bypasses RLS so we must verify that
  --    the calling user is a member of this group.
  -- -------------------------------------------------------
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = (select auth.uid())
  ) into _is_member;

  if not _is_member then
    raise exception 'Permission denied: caller is not a member of this group';
  end if;

  -- -------------------------------------------------------
  -- 2. Compute net balance per member
  --
  --    For expenses (excluding soft-deleted):
  --      paid_by receives  +expense.amount  (they fronted the cost)
  --      each split user   -split.amount    (they owe that portion)
  --
  --    For settlements:
  --      paid_by           -settlement.amount (they paid out)
  --      paid_to           +settlement.amount (they received)
  --
  --    A positive balance means the member is owed money.
  --    A negative balance means the member owes money.
  -- -------------------------------------------------------
  with expense_credits as (
    -- Amount each payer fronted (positive)
    select e.paid_by as user_id,
           sum(e.amount) as net
    from   public.expenses e
    where  e.group_id   = p_group_id
      and  e.is_deleted  = false
    group by e.paid_by
  ),
  expense_debits as (
    -- Amount each split member owes (negative)
    select es.user_id,
           -sum(es.amount) as net
    from   public.expense_splits es
    join   public.expenses e on e.id = es.expense_id
    where  e.group_id   = p_group_id
      and  e.is_deleted  = false
    group by es.user_id
  ),
  settlement_paid as (
    -- Settlements: payer paid out (negative)
    select s.paid_by as user_id,
           -sum(s.amount) as net
    from   public.settlements s
    where  s.group_id = p_group_id
    group by s.paid_by
  ),
  settlement_received as (
    -- Settlements: payee received (positive)
    select s.paid_to as user_id,
           sum(s.amount) as net
    from   public.settlements s
    where  s.group_id = p_group_id
    group by s.paid_to
  ),
  all_movements as (
    select user_id, net from expense_credits
    union all
    select user_id, net from expense_debits
    union all
    select user_id, net from settlement_paid
    union all
    select user_id, net from settlement_received
  ),
  net_balances as (
    select user_id,
           round(sum(net), 2) as balance
    from   all_movements
    group by user_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('user_id', nb.user_id, 'balance', nb.balance)
      order by nb.balance desc
    ),
    '[]'::jsonb
  )
  into _balances
  from net_balances nb;

  -- -------------------------------------------------------
  -- 3. Greedy simplified-debt algorithm
  --
  --    Separate members into creditors (balance > 0) and
  --    debtors (balance < 0). Sort each list by absolute
  --    amount descending. Greedily match the largest
  --    creditor with the largest debtor using
  --    LEAST(abs(debtor), abs(creditor)) as the transfer
  --    amount. Reduce both and repeat until settled.
  -- -------------------------------------------------------

  -- Build parallel arrays for creditors (sorted desc by balance)
  _creditors := array[]::numeric(12,2)[];
  _cred_ids  := array[]::uuid[];
  for _row in
    select (elem->>'user_id')::uuid as user_id,
           (elem->>'balance')::numeric(12,2) as balance
    from   jsonb_array_elements(_balances) as elem
    where  (elem->>'balance')::numeric > 0
    order by (elem->>'balance')::numeric desc
  loop
    _cred_ids  := array_append(_cred_ids,  _row.user_id);
    _creditors := array_append(_creditors, _row.balance);
  end loop;

  -- Build parallel arrays for debtors (sorted desc by absolute balance)
  _debtors  := array[]::numeric(12,2)[];
  _debt_ids := array[]::uuid[];
  for _row in
    select (elem->>'user_id')::uuid as user_id,
           (elem->>'balance')::numeric(12,2) as balance
    from   jsonb_array_elements(_balances) as elem
    where  (elem->>'balance')::numeric < 0
    order by (elem->>'balance')::numeric asc  -- most negative first
  loop
    _debt_ids := array_append(_debt_ids, _row.user_id);
    _debtors  := array_append(_debtors,  abs(_row.balance));
  end loop;

  -- Greedy matching: two-pointer style
  _i := 1;
  _j := 1;
  while _i <= array_length(_creditors, 1)
    and _j <= array_length(_debtors, 1)
  loop
    _settle := least(_creditors[_i], _debtors[_j]);

    if _settle > 0 then
      _debts := _debts || jsonb_build_object(
        'from',   _debt_ids[_j],
        'to',     _cred_ids[_i],
        'amount', round(_settle, 2)
      );
    end if;

    _creditors[_i] := _creditors[_i] - _settle;
    _debtors[_j]   := _debtors[_j]   - _settle;

    if _creditors[_i] = 0 then
      _i := _i + 1;
    end if;

    if _debtors[_j] = 0 then
      _j := _j + 1;
    end if;
  end loop;

  -- -------------------------------------------------------
  -- 4. Return combined result
  -- -------------------------------------------------------
  return jsonb_build_object(
    'balances',         _balances,
    'simplified_debts', _debts
  );
end;
$$;
