-- =============================================================
-- Migration: 00019_activity_log_insert_policy.sql
-- Description: Add INSERT policy on activity_log so server
--              actions can log member_added / member_removed
--              events via the authenticated client.
-- =============================================================

create policy activity_log_insert_policy
  on public.activity_log
  for insert
  to authenticated
  with check (actor_id = (select auth.uid()));
