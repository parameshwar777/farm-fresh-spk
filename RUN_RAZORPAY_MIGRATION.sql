-- =====================================================================
-- RAZORPAY INTEGRATION — Run this once in your Supabase SQL editor
-- =====================================================================

-- 1) Add razorpay tracking columns to orders
alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_signature text;

create index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;

-- 2) Allow service role / admin to update payment fields after webhook
-- (existing "orders admin update" policy already covers admins; webhook
--  uses the service role key which bypasses RLS, so no extra policy needed)
