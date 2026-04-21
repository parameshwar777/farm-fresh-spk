import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase, type Order } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  confirmed: "bg-info text-info-foreground",
  packing: "bg-info text-info-foreground",
  out_for_delivery: "bg-accent text-accent-foreground",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[] | null) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-[100dvh] pb-24">
        <TopBar />
        <div className="px-4 py-6 text-center">
          <p className="text-muted-foreground">Sign in to see your orders</p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign In
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const active = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-[100dvh] pb-24">
      <TopBar />
      <div className="px-4 py-4">
        <h1 className="mb-4 font-display text-2xl font-bold text-primary">My Orders</h1>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-card" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📦</div>
            <p className="mt-3 font-semibold text-primary">No orders yet</p>
            <Link to="/shop" className="mt-3 inline-block text-sm font-semibold text-accent">
              Start shopping →
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2 font-display font-bold text-primary">Active</h2>
                <div className="space-y-2">
                  {active.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-2 font-display font-bold text-primary">Past</h2>
                <div className="space-y-2">
                  {past.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-primary">#{order.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "dd MMM yyyy")}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            STATUS_COLORS[order.status] ?? "bg-muted"
          }`}
        >
          {order.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-2 font-display font-bold text-accent">₹{order.total_amount.toFixed(0)}</p>
    </Link>
  );
}
