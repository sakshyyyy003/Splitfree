-- Fix chicken-and-egg bug: group creators cannot insert themselves as the
-- first member because the old policy only allowed admins — but you can't be
-- an admin before you're a member.
--
-- New rule: a user can insert a row where user_id = their own auth.uid(),
-- OR an existing group admin can insert on behalf of another user.

drop policy if exists group_members_insert_policy on public.group_members;

create policy group_members_insert_policy
  on public.group_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_group_admin(group_id)
  );
