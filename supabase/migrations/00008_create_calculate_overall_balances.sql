-- =============================================================
-- Migration: 00008_create_calculate_overall_balances.sql
-- Description: Create the calculate_overall_balances function
--              that aggregates expense credits/debits and
--              settlement flows across all groups and 1:1
--              expenses for auth.uid(), returning JSONB with
--              counterparty balances and summary totals.
-- =============================================================

-- ----- Function: calculate_overall_balances -----
-- Accepts no arguments; uses auth.uid() internally to prevent
-- privilege escalation.
--
-- Returns a jsonb object with two keys:
--   - counterparties: array of {user_id, net_balance, group_ids}
--   - summary:        {total_owed, total_you_owe, net_balance}
--
-- Positive net_balance = counterparty owes auth.uid() money.
-- Negative net_balance = auth.uid() owes the counterparty.
--
-- Data sources:
--   1. Expense credits  — where paid_by = auth.uid()
--   2. Expense debits   — where auth.uid() appears in expense_splits
--   3. Settlement outflows — where paid_by = auth.uid()
--   4. Settlement inflows  — where paid_to = auth.uid()
--
-- Excludes soft-deleted expenses (is_deleted = false) and
-- self-balances (counterparty = auth.uid()).

create or replace function public.calculate_overall_balances()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _current_user  uuid;
  _counterparties jsonb;
  _total_owed     numeric(12,2);
  _total_you_owe  numeric(12,2);
  _net_balance    numeric(12,2);
begin
  _current_user := (select auth.uid());

  -- -------------------------------------------------------
  -- 1. Compute net balance per counterparty
  --
  --    For expenses (excluding soft-deleted):
  --      Expense credits: auth.uid() paid, each split
  --        participant is a counterparty who owes (+split.amount)
  --      Expense debits:  auth.uid() is a split participant,
  --        the payer is a counterparty we owe (-split.amount)
  --
  --    For settlements:
  --      Settlement outflows: auth.uid() paid_by,
  --        counterparty is paid_to (-settlement.amount)
  --      Settlement inflows:  auth.uid() paid_to,
  --        counterparty is paid_by (+settlement.amount)
  --
  --    A positive net_balance means the counterparty owes us.
  --    A negative net_balance means we owe the counterparty.
  -- -------------------------------------------------------
  with expense_credits as (
    -- When auth.uid() paid, each split participant owes us
    -- their split amount (positive from our perspective).
    -- Exclude splits where the participant is auth.uid() (self).
    select es.user_id      as counterparty_id,
           es.amount        as net,
           e.group_id
    from   public.expenses e
    join   public.expense_splits es on es.expense_id = e.id
    where  e.paid_by    = _current_user
      and  e.is_deleted  = false
      and  es.user_id   <> _current_user
  ),
  expense_debits as (
    -- When auth.uid() is a split participant, we owe the payer
    -- our split amount (negative from our perspective).
    -- Exclude expenses where the payer is auth.uid() (self-paid).
    select e.paid_by       as counterparty_id,
           -es.amount       as net,
           e.group_id
    from   public.expenses e
    join   public.expense_splits es on es.expense_id = e.id
    where  es.user_id   = _current_user
      and  e.is_deleted  = false
      and  e.paid_by    <> _current_user
  ),
  settlement_outflows as (
    -- When auth.uid() pays someone, it reduces what they owe us
    -- (negative from our perspective).
    select s.paid_to       as counterparty_id,
           -s.amount        as net,
           s.group_id
    from   public.settlements s
    where  s.paid_by = _current_user
  ),
  settlement_inflows as (
    -- When someone pays auth.uid(), it reduces what we owe them
    -- (positive from our perspective).
    select s.paid_by       as counterparty_id,
           s.amount         as net,
           s.group_id
    from   public.settlements s
    where  s.paid_to = _current_user
  ),
  all_movements as (
    select counterparty_id, net, group_id from expense_credits
    union all
    select counterparty_id, net, group_id from expense_debits
    union all
    select counterparty_id, net, group_id from settlement_outflows
    union all
    select counterparty_id, net, group_id from settlement_inflows
  ),
  -- -------------------------------------------------------
  -- 2. Aggregate net balance and collect distinct group_ids
  --    per counterparty.
  -- -------------------------------------------------------
  net_balances as (
    select counterparty_id,
           round(sum(net), 2) as net_balance,
           -- Collect distinct non-null group_ids into a jsonb array
           coalesce(
             jsonb_agg(distinct group_id) filter (where group_id is not null),
             '[]'::jsonb
           ) as group_ids
    from   all_movements
    group by counterparty_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id',     nb.counterparty_id,
        'net_balance',  nb.net_balance,
        'group_ids',    nb.group_ids
      )
      order by abs(nb.net_balance) desc
    ),
    '[]'::jsonb
  )
  into _counterparties
  from net_balances nb
  where nb.net_balance <> 0;

  -- -------------------------------------------------------
  -- 3. Compute summary totals
  --
  --    total_owed:    sum of positive net_balances (others owe us)
  --    total_you_owe: sum of absolute negative net_balances (we owe others)
  --    net_balance:   total_owed - total_you_owe
  -- -------------------------------------------------------
  select coalesce(sum(
    case when (elem->>'net_balance')::numeric > 0
         then (elem->>'net_balance')::numeric
         else 0
    end
  ), 0),
  coalesce(sum(
    case when (elem->>'net_balance')::numeric < 0
         then abs((elem->>'net_balance')::numeric)
         else 0
    end
  ), 0)
  into _total_owed, _total_you_owe
  from jsonb_array_elements(_counterparties) as elem;

  _net_balance := round(_total_owed - _total_you_owe, 2);
  _total_owed  := round(_total_owed, 2);
  _total_you_owe := round(_total_you_owe, 2);

  -- -------------------------------------------------------
  -- 4. Return combined result
  -- -------------------------------------------------------
  return jsonb_build_object(
    'counterparties', _counterparties,
    'summary', jsonb_build_object(
      'total_owed',    _total_owed,
      'total_you_owe', _total_you_owe,
      'net_balance',   _net_balance
    )
  );
end;
$$;
