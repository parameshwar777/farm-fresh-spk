-- =====================================================================
-- SPK — Product image toggle + App version gating
-- Run this entire file in the Supabase SQL Editor
-- =====================================================================

-- 1) Products: add use_real_image flag (image_url already exists)
alter table public.products
  add column if not exists use_real_image boolean not null default false;

-- 2) App settings: seed app version keys (admin can edit from /admin/settings)
insert into public.app_settings (key, value) values
  ('min_app_version', '1.0.0'),
  ('current_app_version', '1.0.0'),
  ('app_update_message', 'A new version of SPK Natural Farming is available. Please update to continue.'),
  ('app_store_url_android', ''),
  ('app_store_url_ios', '')
on conflict (key) do nothing;

-- 3) Storage bucket for product images (public read)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 4) Storage policies — public read, admin write
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product-images admin write" on storage.objects;
create policy "product-images admin write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "product-images admin update" on storage.objects;
create policy "product-images admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "product-images admin delete" on storage.objects;
create policy "product-images admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
