-- =====================================================================
-- ADDRESS & ORDER ENHANCEMENTS — run in Supabase SQL editor
-- =====================================================================

-- 1) Add receiver name + phone (mandatory) to addresses
alter table public.addresses
  add column if not exists receiver_name text,
  add column if not exists receiver_phone text;

-- Backfill from profile so existing rows are not broken
update public.addresses a
set receiver_name = coalesce(a.receiver_name, p.full_name, 'Customer'),
    receiver_phone = coalesce(a.receiver_phone, p.phone_number, p.phone, '0000000000')
from public.profiles p
where a.user_id = p.id and (a.receiver_name is null or a.receiver_phone is null);

-- Enforce NOT NULL going forward
alter table public.addresses
  alter column receiver_name set not null,
  alter column receiver_phone set not null;

-- Phone must be 10 digits
alter table public.addresses
  drop constraint if exists addresses_receiver_phone_chk;
alter table public.addresses
  add constraint addresses_receiver_phone_chk
  check (receiver_phone ~ '^[0-9]{10}$');
