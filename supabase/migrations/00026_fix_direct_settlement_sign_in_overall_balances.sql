-- =============================================================
-- Migration: 00026_fix_direct_settlement_sign_in_overall_balances.sql
-- Description:
--   Fix inverted signs for direct (non-group) settlements in
--   calculate_overall_balances. Settlement outflows (current user
--   paid someone) should be positive (reduces debt), and inflows
--   (someone paid current user) should be negative (reduces credit).
--   The previous version had both signs swapped, causing settled
--   amounts to double the displayed debt instead of canceling it.
-- =============================================================

create or replace function public.calculate_overall_balances()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _current_user   uuid;
  _group_row      record;
  _group_result   jsonb;
  _debt_row       record;
  _all_entries    jsonb := '[]'::jsonb;
  _direct_entries jsonb;
  _counterparties jsonb;
  _total_owed     numeric(12,2);
  _total_you_owe  numeric(12,2);
  _net_balance    numeric(12,2);
begin
  _current_user := (select auth.uid());

  -- -------------------------------------------------------
  -- 1a. Simplified group debts
  --     For each group the user belongs to, call
  --     calculate_group_balances to get simplified debts,
  --     then extract debts involving the current user.
  -- -------------------------------------------------------
  for _group_row in
    select gm.group_id
    from   public.group_members gm
    where  gm.user_id = _current_user
  loop
    _group_result := public.calculate_group_balances(_group_row.group_id);

    for _debt_row in
      select (elem->>'from')::uuid            as from_id,
             (elem->>'to')::uuid              as to_id,
             (elem->>'amount')::numeric(12,2) as amount
      from   jsonb_array_elements(
               coalesce(_group_result->'simplified_debts', '[]'::jsonb)
             ) as elem
    loop
      if _debt_row.from_id = _current_user then
        -- Current user is debtor in this group
        _all_entries := _all_entries || jsonb_build_object(
          'counterparty_id', _debt_row.to_id,
          'net',             -_debt_row.amount,
          'group_id',        _group_row.group_id
        );
      elsif _debt_row.to_id = _current_user then
        -- Current user is creditor in this group
        _all_entries := _all_entries || jsonb_build_object(
          'counterparty_id', _debt_row.from_id,
          'net',             _debt_row.amount,
          'group_id',        _group_row.group_id
        );
      end if;
    end loop;
  end loop;

  -- -------------------------------------------------------
  -- 1b. Direct expense balances (group_id IS NULL)
  --     No group simplification — pairwise by nature.
  -- -------------------------------------------------------

  -- Credits: current user paid, split participants owe us
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.user_id,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select es.user_id, round(es.amount, 2) as amount
    from   public.expenses e
    join   public.expense_splits es on es.expense_id = e.id
    where  e.paid_by    = _current_user
      and  e.is_deleted  = false
      and  e.group_id   is null
      and  es.user_id   <> _current_user
  ) sub;
  _all_entries := _all_entries || _direct_entries;

  -- Debits: someone else paid, current user is in split
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.paid_by,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select e.paid_by, -round(es.amount, 2) as amount
    from   public.expenses e
    join   public.expense_splits es on es.expense_id = e.id
    where  es.user_id   = _current_user
      and  e.is_deleted  = false
      and  e.group_id   is null
      and  e.paid_by    <> _current_user
  ) sub;
  _all_entries := _all_entries || _direct_entries;

  -- Direct settlement outflows: current user paid someone
  -- FIXED: positive sign — paying someone reduces what you owe them
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.paid_to,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select s.paid_to, round(s.amount, 2) as amount
    from   public.settlements s
    where  s.paid_by  = _current_user
      and  s.group_id is null
  ) sub;
  _all_entries := _all_entries || _direct_entries;

  -- Direct settlement inflows: someone paid current user
  -- FIXED: negative sign — someone paying you reduces what they owe you
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.paid_by,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select s.paid_by, -round(s.amount, 2) as amount
    from   public.settlements s
    where  s.paid_to  = _current_user
      and  s.group_id is null
  ) sub;
  _all_entries := _all_entries || _direct_entries;

  -- -------------------------------------------------------
  -- 2. Aggregate per counterparty with breakdowns
  -- -------------------------------------------------------
  with entries as (
    select (elem->>'counterparty_id')::uuid     as counterparty_id,
           (elem->>'net')::numeric(12,2)         as net,
           (elem->>'group_id')::uuid             as group_id
    from   jsonb_array_elements(_all_entries) as elem
  ),
  per_group as (
    select counterparty_id,
           group_id,
           round(sum(net), 2) as amount
    from   entries
    group by counterparty_id, group_id
  ),
  per_counterparty as (
    select counterparty_id,
           round(sum(amount), 2) as net_balance,
           coalesce(
             jsonb_agg(distinct pg.group_id)
               filter (where pg.group_id is not null),
             '[]'::jsonb
           ) as group_ids,
           coalesce(
             jsonb_agg(
               jsonb_build_object('group_id', pg.group_id, 'amount', pg.amount)
             ) filter (where pg.amount <> 0),
             '[]'::jsonb
           ) as breakdowns
    from   per_group pg
    group by counterparty_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id',     pc.counterparty_id,
        'net_balance', pc.net_balance,
        'group_ids',   pc.group_ids,
        'breakdowns',  pc.breakdowns
      )
      order by abs(pc.net_balance) desc
    ),
    '[]'::jsonb
  )
  into _counterparties
  from per_counterparty pc
  where pc.net_balance <> 0;

  -- -------------------------------------------------------
  -- 3. Compute summary totals
  -- -------------------------------------------------------
  select coalesce(sum(
    case when (elem->>'net_balance')::numeric > 0
         then (elem->>'net_balance')::numeric else 0 end
  ), 0),
  coalesce(sum(
    case when (elem->>'net_balance')::numeric < 0
         then abs((elem->>'net_balance')::numeric) else 0 end
  ), 0)
  into _total_owed, _total_you_owe
  from jsonb_array_elements(_counterparties) as elem;

  _net_balance   := round(_total_owed - _total_you_owe, 2);
  _total_owed    := round(_total_owed, 2);
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
