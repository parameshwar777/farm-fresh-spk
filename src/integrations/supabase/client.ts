import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
  avatar_url: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock_quantity: number;
  category_id: string;
  image_url: string | null;
  emoji: string;
  harvest_date: string | null;
  farming_method: string;
  is_available: boolean;
  is_featured: boolean;
  discount_percent: number;
  created_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  city: string;
  pincode: string;
  is_default: boolean;
};

export type DeliverySlot = {
  id: string;
  slot_label: string;
  slot_date: string;
  max_orders: number;
  current_orders: number;
  is_active: boolean;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  user_id: string;
  address_id: string | null;
  delivery_slot_id: string | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: "cod" | "upi" | "online";
  payment_status: "pending" | "paid";
  notes: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  unit: string;
};

export type AppSettings = {
  key: string;
  value: string;
};
