-- =====================================================================
-- ADDRESS & ORDER ENHANCEMENTS — run in Supabase SQL editor
-- Safe to re-run.
-- =====================================================================

-- 1) Add receiver name + phone columns (nullable first)
alter table public.addresses
  add column if not exists receiver_name text,
  add column if not exists receiver_phone text;

-- 2) Backfill from profile so existing rows are not broken
update public.addresses a
set receiver_name = coalesce(a.receiver_name, p.full_name, 'Customer'),
    receiver_phone = coalesce(a.receiver_phone, p.phone_number, p.phone)
from public.profiles p
where a.user_id = p.id
  and (a.receiver_name is null or a.receiver_phone is null);

-- 3) Normalise phone numbers: strip everything that isn't a digit,
--    drop a leading country code (91) if present, keep last 10 digits.
update public.addresses
set receiver_phone = right(regexp_replace(coalesce(receiver_phone, ''), '\D', '', 'g'), 10)
where receiver_phone is not null;

-- 4) Anything still invalid (null, empty, or not 10 digits) gets a
--    placeholder so the NOT NULL + CHECK can be applied. Users will be
--    forced to update it the next time they edit the address.
update public.addresses
set receiver_phone = '0000000000'
where receiver_phone is null
   or receiver_phone !~ '^[0-9]{10}$';

update public.addresses
set receiver_name = 'Customer'
where receiver_name is null or length(trim(receiver_name)) = 0;

-- 5) Enforce NOT NULL going forward
alter table public.addresses
  alter column receiver_name set not null,
  alter column receiver_phone set not null;

-- 6) Phone must be exactly 10 digits
alter table public.addresses
  drop constraint if exists addresses_receiver_phone_chk;
alter table public.addresses
  add constraint addresses_receiver_phone_chk
  check (receiver_phone ~ '^[0-9]{10}$');
