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



-- ============================ PART 3 START ============================
-- In-app notifications for admin & merchant.
-- Run this AFTER Part 2 has succeeded.

-- 6) Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text not null check (recipient_role in ('admin','merchant','customer')),
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  type text not null,           -- 'order_paid' | 'order_status' | 'low_stock' | 'new_user'
  title text not null,
  body text,
  link text,                    -- in-app deeplink
  metadata jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_role_idx
  on public.notifications (recipient_role, is_read, created_at desc);
create index if not exists notifications_user_idx
  on public.notifications (recipient_user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications read" on public.notifications;
create policy "notifications read" on public.notifications
  for select using (
    (recipient_role = 'admin'    and public.is_admin(auth.uid()))
    or (recipient_role = 'merchant' and public.is_merchant(auth.uid()))
    or (recipient_user_id = auth.uid())
  );

drop policy if exists "notifications update" on public.notifications;
create policy "notifications update" on public.notifications
  for update using (
    (recipient_role = 'admin'    and public.is_admin(auth.uid()))
    or (recipient_role = 'merchant' and public.is_merchant(auth.uid()))
    or (recipient_user_id = auth.uid())
  );

drop policy if exists "notifications insert admin" on public.notifications;
create policy "notifications insert admin" on public.notifications
  for insert with check (public.is_admin(auth.uid()));

-- Enable realtime (idempotent — wrap in DO so re-runs don't error)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- 7) Trigger: notify admin + merchant when an order becomes paid
create or replace function public.notify_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  short_id text;
  customer_name text;
begin
  if (tg_op = 'INSERT' and new.payment_status = 'paid')
     or (tg_op = 'UPDATE' and new.payment_status = 'paid'
         and (old.payment_status is distinct from 'paid')) then
    short_id := upper(substring(new.id::text, 1, 8));
    select coalesce(full_name, email, 'Customer') into customer_name
      from public.profiles where id = new.user_id;

    insert into public.notifications (recipient_role, type, title, body, link, metadata)
    values
      ('admin',    'order_paid',
        'New paid order #' || short_id,
        'From ' || customer_name || ' · Rs. ' || new.total_amount::text,
        '/admin/orders',
        jsonb_build_object('order_id', new.id, 'amount', new.total_amount)),
      ('merchant', 'order_paid',
        'New paid order #' || short_id,
        'From ' || customer_name || ' · Rs. ' || new.total_amount::text,
        '/merchant',
        jsonb_build_object('order_id', new.id, 'amount', new.total_amount));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_order_paid on public.orders;
create trigger trg_notify_order_paid
  after insert or update of payment_status on public.orders
  for each row execute function public.notify_order_paid();

-- 8) Trigger: notify admin + customer when order status changes
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  short_id text;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    short_id := upper(substring(new.id::text, 1, 8));

    insert into public.notifications (recipient_role, type, title, body, link, metadata)
    values
      ('admin', 'order_status',
        'Order #' || short_id || ' -> ' || replace(new.status::text, '_', ' '),
        'Status changed to ' || replace(new.status::text, '_', ' '),
        '/admin/orders',
        jsonb_build_object('order_id', new.id,
                           'from', old.status, 'to', new.status));

    insert into public.notifications (recipient_role, recipient_user_id,
                                       type, title, body, link, metadata)
    values
      ('customer', new.user_id, 'order_status',
        'Your order #' || short_id || ' is ' || replace(new.status::text, '_', ' '),
        null,
        '/orders/' || new.id::text,
        jsonb_build_object('order_id', new.id, 'status', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_order_status on public.orders;
create trigger trg_notify_order_status
  after update of status on public.orders
  for each row execute function public.notify_order_status();

-- 9) Trigger: notify admin when stock drops to/below 5
create or replace function public.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.stock_quantity <= 5
     and (old.stock_quantity is null or old.stock_quantity > 5) then
    insert into public.notifications (recipient_role, type, title, body, link, metadata)
    values
      ('admin', 'low_stock',
        'Low stock: ' || new.name,
        'Only ' || new.stock_quantity::text || ' ' || new.unit || ' left',
        '/admin/products',
        jsonb_build_object('product_id', new.id, 'qty', new.stock_quantity));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_low_stock on public.products;
create trigger trg_notify_low_stock
  after update of stock_quantity on public.products
  for each row execute function public.notify_low_stock();

-- 10) Trigger: notify admin when a new user signs up
create or replace function public.notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_role, type, title, body, link, metadata)
  values
    ('admin', 'new_user',
      'New user signed up',
      coalesce(new.full_name, new.email, new.phone, 'Customer')
        || ' just joined SPK',
      '/admin/users',
      jsonb_build_object('user_id', new.id));
  return new;
end;
$$;

drop trigger if exists trg_notify_new_user on public.profiles;
create trigger trg_notify_new_user
  after insert on public.profiles
  for each row execute function public.notify_new_user();

-- ============================ PART 3 END ==============================


-- =====================================================================
-- HOW TO MAKE YOURSELF ADMIN (run as a separate query after Parts 1, 2 & 3):
--   update public.profiles set role='admin' where lower(email)=lower('your@email.com');
-- =====================================================================
