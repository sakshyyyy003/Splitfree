-- =============================================================
-- Migration: 00024_rewrite_overall_balances_with_simplified_debts.sql
-- Description:
--   1. Fix calculate_group_balances to use group-scoped settlements
--      only (reverts global settlement scope from 00023). The cascade
--      settlement approach in the app creates group-scoped settlement
--      rows, so the balance function must match.
--   2. Rewrite calculate_overall_balances to aggregate simplified
--      group debts (from calculate_group_balances) plus direct
--      expense pairwise balances, returning per-counterparty
--      breakdowns.
-- =============================================================


-- ----- 1. Fix calculate_group_balances -----
-- Restores group-scoped settlement filter (s.group_id = p_group_id)
-- with the correct sign convention (paid_by +, paid_to -).

create or replace function public.calculate_group_balances(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _is_member boolean;
  _balances  jsonb;
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
  -- Membership guard
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = (select auth.uid())
  ) into _is_member;

  if not _is_member then
    raise exception 'Permission denied: caller is not a member of this group';
  end if;

  -- Net balance per member
  with expense_credits as (
    select e.paid_by as user_id,
           sum(e.amount) as net
    from   public.expenses e
    where  e.group_id   = p_group_id
      and  e.is_deleted  = false
    group by e.paid_by
  ),
  expense_debits as (
    select es.user_id,
           -sum(es.amount) as net
    from   public.expense_splits es
    join   public.expenses e on e.id = es.expense_id
    where  e.group_id   = p_group_id
      and  e.is_deleted  = false
    group by es.user_id
  ),
  settlement_paid as (
    -- Group-scoped only: payer's balance increases (debt repaid)
    select s.paid_by as user_id,
           sum(s.amount) as net
    from   public.settlements s
    where  s.group_id = p_group_id
    group by s.paid_by
  ),
  settlement_received as (
    -- Group-scoped only: payee's balance decreases (received repayment)
    select s.paid_to as user_id,
           -sum(s.amount) as net
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

  -- Greedy simplified-debt algorithm
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

  _debtors  := array[]::numeric(12,2)[];
  _debt_ids := array[]::uuid[];
  for _row in
    select (elem->>'user_id')::uuid as user_id,
           (elem->>'balance')::numeric(12,2) as balance
    from   jsonb_array_elements(_balances) as elem
    where  (elem->>'balance')::numeric < 0
    order by (elem->>'balance')::numeric asc
  loop
    _debt_ids := array_append(_debt_ids, _row.user_id);
    _debtors  := array_append(_debtors,  abs(_row.balance));
  end loop;

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

    if _creditors[_i] = 0 then _i := _i + 1; end if;
    if _debtors[_j] = 0 then _j := _j + 1; end if;
  end loop;

  return jsonb_build_object(
    'balances',         _balances,
    'simplified_debts', _debts
  );
end;
$$;


-- ----- 2. Rewrite calculate_overall_balances -----
-- Aggregates simplified group debts + direct pairwise balances.
-- Returns counterparties with per-group/direct breakdowns.

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
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.paid_to,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select s.paid_to, -round(s.amount, 2) as amount
    from   public.settlements s
    where  s.paid_by  = _current_user
      and  s.group_id is null
  ) sub;
  _all_entries := _all_entries || _direct_entries;

  -- Direct settlement inflows: someone paid current user
  select coalesce(jsonb_agg(jsonb_build_object(
    'counterparty_id', sub.paid_by,
    'net',             sub.amount,
    'group_id',        null
  )), '[]'::jsonb)
  into _direct_entries
  from (
    select s.paid_by, round(s.amount, 2) as amount
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
