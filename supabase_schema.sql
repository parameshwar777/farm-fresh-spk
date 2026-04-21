-- =====================================================================
-- SPK Natural Farming — Database Schema
-- Run this entire file in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type public.app_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending','confirmed','packing','out_for_delivery','delivered','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod','upi','online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid');
exception when duplicate_object then null; end $$;

-- ===================================================================
-- TABLES
-- ===================================================================

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role app_role not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🥦',
  image_url text,
  display_order int not null default 0,
  is_active boolean not null default true
);

-- products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  unit text not null default 'per kg',
  stock_quantity numeric(10,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  emoji text not null default '🥦',
  harvest_date date,
  farming_method text not null default 'SPK Method',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  discount_percent int not null default 0 check (discount_percent between 0 and 100),
  created_at timestamptz not null default now()
);

-- addresses
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_address text not null,
  city text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  is_default boolean not null default false
);

-- delivery_slots
create table if not exists public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  slot_label text not null,
  slot_date date not null,
  max_orders int not null default 20,
  current_orders int not null default 0,
  is_active boolean not null default true
);

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  address_id uuid references public.addresses(id) on delete set null,
  delivery_slot_id uuid references public.delivery_slots(id) on delete set null,
  status order_status not null default 'pending',
  total_amount numeric(10,2) not null default 0,
  payment_method payment_method not null default 'cod',
  payment_status payment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

-- order_items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(10,2) not null check (quantity > 0),
  price_at_time numeric(10,2) not null,
  unit text not null default 'per kg'
);

-- banners
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  display_order int not null default 0,
  is_active boolean not null default true
);

-- app_settings
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

-- ===================================================================
-- HELPER FUNCTIONS (security definer to avoid RLS recursion)
-- ===================================================================

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = 'admin'
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================================================================
-- RLS
-- ===================================================================

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.addresses       enable row level security;
alter table public.delivery_slots  enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.banners         enable row level security;
alter table public.app_settings    enable row level security;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- categories: public read, admin write
drop policy if exists "categories read all" on public.categories;
create policy "categories read all" on public.categories
  for select using (true);

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- products: public read, admin write
drop policy if exists "products read all" on public.products;
create policy "products read all" on public.products
  for select using (true);

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- addresses: own only
drop policy if exists "addresses own" on public.addresses;
create policy "addresses own" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- delivery_slots: public read, admin write
drop policy if exists "slots read all" on public.delivery_slots;
create policy "slots read all" on public.delivery_slots
  for select using (true);

drop policy if exists "slots admin write" on public.delivery_slots;
create policy "slots admin write" on public.delivery_slots
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- orders
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "orders own insert" on public.orders;
create policy "orders own insert" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (public.is_admin(auth.uid()) or auth.uid() = user_id);

-- order_items
drop policy if exists "order_items own read" on public.order_items;
create policy "order_items own read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "order_items own insert" on public.order_items;
create policy "order_items own insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- banners: public read, admin write
drop policy if exists "banners read all" on public.banners;
create policy "banners read all" on public.banners for select using (true);

drop policy if exists "banners admin write" on public.banners;
create policy "banners admin write" on public.banners
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- app_settings
drop policy if exists "settings read all" on public.app_settings;
create policy "settings read all" on public.app_settings for select using (true);

drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===================================================================
-- SEED DATA
-- ===================================================================

insert into public.app_settings (key, value) values
  ('min_order_amount', '100'),
  ('delivery_charge', '20'),
  ('free_delivery_above', '500'),
  ('store_open', 'true'),
  ('store_message', 'Fresh vegetables delivered daily!')
on conflict (key) do nothing;

insert into public.categories (name, emoji, display_order) values
  ('Vegetables', '🥦', 1),
  ('Fruits', '🍎', 2),
  ('Food Grains', '🌾', 3),
  ('Herbs', '🌿', 4)
on conflict do nothing;

-- Sample products
do $$
declare
  veg_id uuid; fruit_id uuid; grain_id uuid;
begin
  select id into veg_id   from public.categories where name='Vegetables' limit 1;
  select id into fruit_id from public.categories where name='Fruits' limit 1;
  select id into grain_id from public.categories where name='Food Grains' limit 1;

  insert into public.products (name, emoji, price, unit, stock_quantity, category_id, is_featured, harvest_date, description) values
    ('Tomato',    '🍅', 30, 'per kg', 100, veg_id,   true,  current_date, 'Fresh, juicy tomatoes grown using SPK Natural Farming methods.'),
    ('Brinjal',   '🍆', 50, 'per kg', 50,  veg_id,   false, current_date, 'Tender purple brinjals straight from the farm.'),
    ('Drumstick', '🌿', 30, 'per kg', 40,  veg_id,   false, current_date, 'Nutrient-rich drumsticks (moringa).'),
    ('Carrot',    '🥕', 40, 'per kg', 60,  veg_id,   false, current_date, 'Sweet, crunchy carrots.'),
    ('Banana',    '🍌', 60, 'per dozen', 80, fruit_id, true,  current_date, 'Naturally ripened bananas.'),
    ('Rice',      '🌾', 80, 'per kg', 200, grain_id, false, current_date, 'Traditional rice grown the SPK way.')
  on conflict do nothing;
end $$;

-- ===================================================================
-- HOW TO MAKE YOURSELF ADMIN
-- After signing up in the app, run:
--   update public.profiles set role='admin' where id = auth.uid();
-- (or replace auth.uid() with your user UUID from auth.users)
-- ===================================================================
