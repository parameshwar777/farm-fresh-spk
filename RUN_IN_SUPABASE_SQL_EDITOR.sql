-- =====================================================================
-- IMPORTANT: This file has TWO PARTS. Run them as TWO SEPARATE QUERIES.
-- Postgres does NOT allow a new enum value to be used in the same
-- transaction that adds it. The SQL editor runs each query in its own
-- transaction, so we MUST split this.
--
-- STEP 1: Select ONLY the lines between "PART 1 START" and "PART 1 END"
--         and click "Run".
-- STEP 2: Then select ONLY the lines between "PART 2 START" and "PART 2 END"
--         and click "Run".
-- =====================================================================


-- ============================ PART 1 START ============================
-- Adds the 'merchant' enum value, profile columns, and signup trigger.
-- Run this FIRST. Wait for "Success".

-- 1) Add 'merchant' to the app_role enum (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'merchant'
  ) then
    alter type public.app_role add value 'merchant';
  end if;
end $$;

-- 2) Add new profile columns (idempotent)
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone_number text;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- 3) Replace signup trigger to fill email + phone_number from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', new.phone, ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, '')
  )
  on conflict (id) do update
    set full_name    = coalesce(excluded.full_name, public.profiles.full_name),
        email        = coalesce(excluded.email, public.profiles.email),
        phone        = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
        phone_number = coalesce(nullif(excluded.phone_number, ''), public.profiles.phone_number);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================ PART 1 END ==============================



-- ============================ PART 2 START ============================
-- Adds is_merchant() helper and RLS policies that USE the 'merchant' value.
-- Run this AFTER Part 1 has succeeded.

-- 4) Helper functions
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = 'admin'
  );
$$;

create or replace function public.is_merchant(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = 'merchant'
  );
$$;

-- 5) Update RLS policies

-- profiles: admin/merchant can read other profiles; admin can update any
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin(auth.uid())
    or public.is_merchant(auth.uid())
  );

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- orders: merchants can read AND update PAID orders only
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders
  for select using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or (public.is_merchant(auth.uid()) and payment_status = 'paid')
  );

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (
    public.is_admin(auth.uid())
    or auth.uid() = user_id
    or (public.is_merchant(auth.uid()) and payment_status = 'paid')
  )
  with check (
    public.is_admin(auth.uid())
    or auth.uid() = user_id
    or (public.is_merchant(auth.uid()) and payment_status = 'paid')
  );

-- order_items: merchants can read items of paid orders
drop policy if exists "order_items own read" on public.order_items;
create policy "order_items own read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid()
          or public.is_admin(auth.uid())
          or (public.is_merchant(auth.uid()) and o.payment_status = 'paid')
        )
    )
  );

-- addresses: merchants need to read addresses for delivery
drop policy if exists "addresses own" on public.addresses;
create policy "addresses own" on public.addresses
  for all using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or public.is_merchant(auth.uid())
  )
  with check (auth.uid() = user_id);

-- ============================ PART 2 END ==============================


-- =====================================================================
-- HOW TO MAKE YOURSELF ADMIN (run as a third query after Parts 1 + 2):
--   update public.profiles set role='admin' where lower(email)=lower('your@email.com');
-- =====================================================================
