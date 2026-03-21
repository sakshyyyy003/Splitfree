-- =============================================================
-- Migration: 00021_skip_audit_log_on_expense_delete.sql
-- Description: Fix group deletion failure caused by the
--              on_expense_change trigger.
--
-- Root cause:  When a group is deleted, ON DELETE CASCADE
--              removes its expenses. The trigger fires on each
--              expense DELETE and tries to INSERT into
--              expense_audit_log referencing the expense being
--              deleted, violating the FK constraint
--              expense_audit_log_expense_id_fkey.
--
-- Fix:         Skip audit logging on DELETE operations.
--              Auditing a delete that is part of a cascade
--              (group deletion) has no value — the entire
--              group and all associated data is permanently
--              removed.
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
  -- Skip audit logging on DELETE to avoid FK violation during
  -- cascade deletes (e.g. when a group is deleted).
  if tg_op = 'DELETE' then
    return old;
  end if;

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
  end case;

  insert into public.expense_audit_log (expense_id, changed_by, action, old_values, new_values)
  values (
    coalesce(new.id, old.id),
    _changed_by,
    _action,
    _old_values,
    _new_values
  );

  return new;
end;
$$;
