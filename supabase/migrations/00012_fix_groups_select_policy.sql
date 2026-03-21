-- Fix chicken-and-egg bug: group creators cannot read their own group
-- immediately after insert because the SELECT policy only checked
-- is_group_member(id) — which is false until the creator is added to
-- group_members (a step that happens after the insert).
--
-- New rule: a user can SELECT a group if they created it OR they are a member.

drop policy if exists groups_select_policy on public.groups;

create policy groups_select_policy
  on public.groups
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_group_member(id)
  );
