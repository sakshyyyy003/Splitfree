-- Fix: non-members cannot look up a group by invite code because the
-- groups SELECT policy requires is_group_member(id) or created_by = auth.uid().
-- When joining via invite, neither condition is true yet.
--
-- This SECURITY DEFINER function bypasses RLS to return minimal group info
-- given a valid invite code. The invite code itself acts as authorization.

create or replace function public.lookup_group_by_invite_code(_invite_code text)
returns table (
  id uuid,
  name varchar(100),
  category varchar(20),
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select g.id, g.name, g.category, g.created_at
  from public.groups g
  where g.invite_code = _invite_code
  limit 1;
$$;
