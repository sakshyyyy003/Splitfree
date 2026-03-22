-- REVERTED: This migration was superseded by the cascade settlement approach.
-- The calculate_group_balances function has been reverted to group-scoped settlements
-- via migration revert_global_settlements.
-- Original intent: global settlements in group balance calc (proven flawed).

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

  with group_member_ids as (
    select user_id from public.group_members where group_id = p_group_id
  ),
  expense_credits as (
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
    -- All settlements where payer is a group member and payee is a group member
    select s.paid_by as user_id,
           sum(s.amount) as net
    from   public.settlements s
    where  s.paid_by in (select user_id from group_member_ids)
      and  s.paid_to in (select user_id from group_member_ids)
    group by s.paid_by
  ),
  settlement_received as (
    select s.paid_to as user_id,
           -sum(s.amount) as net
    from   public.settlements s
    where  s.paid_by in (select user_id from group_member_ids)
      and  s.paid_to in (select user_id from group_member_ids)
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
