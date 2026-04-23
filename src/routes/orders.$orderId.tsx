import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  supabase,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
} from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppBack } from "@/hooks/useAppBack";

export const Route = createFileRoute("/orders/$orderId")({
  component: OrderTrackingPage,
});

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Order placed" },
  { key: "confirmed", label: "Payment received / Confirmed" },
  { key: "packing", label: "Packing your order" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function OrderTrackingPage() {
  const { orderId } = Route.useParams();
  const { goBack } = useAppBack("/orders");
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<(OrderItem & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: its }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase
          .from("order_items")
          .select("*, product:products(*)")
          .eq("order_id", orderId),
      ]);
      setOrder(o as Order | null);
      setItems((its as (OrderItem & { product?: Product })[] | null) ?? []);
      setLoading(false);

      const channel = supabase
        .channel(`order:${orderId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
          (payload) => setOrder(payload.new as Order),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [orderId]);

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-9 w-9 rounded-full bg-card" />
        <Skeleton className="mt-4 h-32 w-full bg-card" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const currentStepIdx =
    order.status === "cancelled" ? -1 : STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-[100dvh] pb-12">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => goBack("/orders")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">
          Order #{order.id.slice(0, 8)}
        </h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Placed on {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-card px-2 py-0.5 font-semibold text-primary">
            {order.payment_method === "online" ? "Online" : "Cash on Delivery"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              order.payment_status === "paid"
                ? "bg-success text-success-foreground"
                : "bg-warning text-warning-foreground"
            }`}
          >
            {order.payment_status === "paid" ? "Payment received" : "Payment pending"}
          </span>
          {order.notes?.startsWith("[slot]") && (
            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
              {order.notes.replace("[slot] ", "🕒 ")}
            </span>
          )}
        </div>

        {order.status === "cancelled" ? (
          <div className="mt-4 rounded-2xl bg-destructive/10 p-4 text-center font-bold text-destructive">
            Order Cancelled
          </div>
        ) : (
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx;
              const current = idx === currentStepIdx;
              return (
                <motion.li
                  key={step.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      done ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    } ${current ? "animate-pulse ring-2 ring-primary/40" : ""}`}
                  >
                    {done ? <Check className="h-5 w-5" /> : <span className="text-xs">{idx + 1}</span>}
                  </div>
                  <span
                    className={`font-semibold ${
                      done ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        )}

        <section className="mt-6 rounded-2xl bg-card p-4">
          <h2 className="mb-2 font-display font-bold text-primary">Items</h2>
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {it.product?.emoji} {it.product?.name} × {it.quantity}
                </span>
                <span className="font-semibold text-primary">
                  ₹{(it.price_at_time * it.quantity).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-border pt-2 flex justify-between font-display font-bold text-primary">
            <span>Total</span>
            <span>₹{order.total_amount.toFixed(0)}</span>
          </div>
        </section>

        <Link
          to="/profile"
          className="mt-6 block rounded-full bg-card py-3 text-center text-sm font-semibold text-primary"
        >
          Need Help?
        </Link>
      </div>
    </div>
  );
}
