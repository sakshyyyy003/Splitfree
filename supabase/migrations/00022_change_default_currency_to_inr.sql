-- Change the default currency from USD to INR and update all existing groups.

-- 1. Update existing groups that still have USD
update public.groups
set currency = 'INR'
where currency = 'USD';

-- 2. Change the column default for new groups
alter table public.groups
  alter column currency set default 'INR';
