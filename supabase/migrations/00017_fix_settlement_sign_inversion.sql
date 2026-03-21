-- Fix settlement sign inversion in balance calculations.
--
-- The settlement signs were backwards in both RPC functions:
--   paid_by (settling a debt) was negative, should be positive
--   paid_to (receiving settlement) was positive, should be negative
--
-- Correct semantics:
--   paid_by = paying off your debt = reduces your negative balance = +
--   paid_to = receiving payment = reduces your positive balance = -

-- Fix calculate_group_balances
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
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = (select auth.uid())
  ) into _is_member;

  if not _is_member then
    raise exception 'Permission denied: caller is not a member of this group';
  end if;

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
    -- Settlements: payer settles their debt (positive for payer)
    select s.paid_by as user_id,
           sum(s.amount) as net
    from   public.settlements s
    where  s.group_id = p_group_id
    group by s.paid_by
  ),
  settlement_received as (
    -- Settlements: payee receives payment (negative for payee)
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

-- Fix calculate_overall_balances
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

  with expense_credits as (
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
    -- auth.uid() pays someone: settles our debt to them (positive for us)
    select s.paid_to       as counterparty_id,
           s.amount         as net,
           s.group_id
    from   public.settlements s
    where  s.paid_by = _current_user
  ),
  settlement_inflows as (
    -- Someone pays auth.uid(): reduces what they owe us (negative for us)
    select s.paid_by       as counterparty_id,
           -s.amount        as net,
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
  net_balances as (
    select counterparty_id,
           round(sum(net), 2) as net_balance,
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
