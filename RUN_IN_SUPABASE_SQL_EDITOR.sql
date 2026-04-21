-- =====================================================================
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- 1) Adds email + phone_number columns
-- 2) Updates trigger to populate email + phone from auth.users on signup
-- 3) Wipes all existing users for a clean start
-- =====================================================================

-- 1) Add new columns (idempotent)
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone_number text;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- 2) Replace the signup trigger to fill email + phone_number from auth.users
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

-- 3) RESET: remove ALL existing users (cascades to profiles, addresses, orders, etc.)
delete from public.profiles;
delete from auth.users;
