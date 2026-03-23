-- =============================================================
-- Migration: 00025_create_multi_group_balances.sql
-- Description: Batch version of calculate_group_balances that
--              accepts an array of group IDs and returns balances
--              for all groups in a single database round-trip.
-- =============================================================

create or replace function public.calculate_multi_group_balances(p_group_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _group_id    uuid;
  _result      jsonb := '{}'::jsonb;
  _group_result jsonb;
  _is_member   boolean;
begin
  foreach _group_id in array p_group_ids
  loop
    -- Only include groups where the calling user is a member
    select exists (
      select 1 from public.group_members
      where group_id = _group_id and user_id = (select auth.uid())
    ) into _is_member;

    if _is_member then
      _group_result := public.calculate_group_balances(_group_id);
      _result := _result || jsonb_build_object(_group_id::text, _group_result);
    end if;
  end loop;

  return _result;
end;
$$;
