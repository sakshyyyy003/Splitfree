-- =============================================================
-- Migration: 00014_fix_expense_audit_log_changed_by.sql
-- Description: Fix the handle_expense_audit_log trigger function
--              so that changed_by no longer relies solely on
--              auth.uid(), which returns NULL when the JWT
--              context is unavailable (e.g. migrations, crons,
--              or certain Supabase edge cases).
--
-- Root cause:  The trigger used (select auth.uid()) as the
--              changed_by value. auth.uid() reads the
--              request.jwt.claim.sub GUC, which is only set
--              when the request flows through PostgREST with a
--              valid JWT. Any other execution path causes a
--              NOT NULL violation on expense_audit_log.changed_by.
--
-- Fix:         Use coalesce(auth.uid(), NEW/OLD.created_by) so
--              we prefer the real authenticated user when
--              available, but fall back to the expense creator
--              when no JWT context exists.
-- =============================================================

create or replace function public.handle_expense_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _action     varchar(20);
  _old_values jsonb;
  _new_values jsonb;
  _changed_by uuid;
begin
  case tg_op
    when 'INSERT' then
      _action     := 'created';
      _old_values := null;
      _new_values := to_jsonb(new);
      _changed_by := coalesce((select auth.uid()), new.created_by);
    when 'UPDATE' then
      _action     := 'updated';
      _old_values := to_jsonb(old);
      _new_values := to_jsonb(new);
      _changed_by := coalesce((select auth.uid()), new.created_by);
    when 'DELETE' then
      _action     := 'deleted';
      _old_values := to_jsonb(old);
      _new_values := null;
      _changed_by := coalesce((select auth.uid()), old.created_by);
  end case;

  insert into public.expense_audit_log (expense_id, changed_by, action, old_values, new_values)
  values (
    coalesce(new.id, old.id),
    _changed_by,
    _action,
    _old_values,
    _new_values
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;
