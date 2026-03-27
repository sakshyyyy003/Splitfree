-- Migration: 00027_fix_group_category_check_constraint.sql
-- Description: Add 'friends' and 'work' to the groups category check constraint

alter table public.groups
  drop constraint if exists groups_category_check;

alter table public.groups
  add constraint groups_category_check
    check (category in ('trip', 'home', 'couple', 'work', 'friends', 'other'));
