import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, IndianRupee, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { supabase, type Order } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ ordersToday: 0, revenueToday: 0, pending: 0, lowStock: 0 });
  const [recent, setRecent] = useState<Order[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const loadAll = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const iso = todayStart.toISOString();

    const [{ data: today }, { data: pending }, { data: low }, { data: recentData }] =
      await Promise.all([
        supabase.from("orders").select("total_amount").gte("created_at", iso),
        supabase.from("orders").select("id", { head: true, count: "exact" }).eq("status", "pending"),
        supabase
          .from("products")
          .select("id", { head: true, count: "exact" })
          .lt("stock_quantity", 10),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

    setStats({
      ordersToday: today?.length ?? 0,
      revenueToday: (today ?? []).reduce((s, o) => s + Number(o.total_amount), 0),
      pending: (pending as unknown as { count: number })?.count ?? 0,
      lowStock: (low as unknown as { count: number })?.count ?? 0,
    });
    setRecent((recentData as Order[] | null) ?? []);
  };

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setRecent((prev) => [newOrder, ...prev].slice(0, 10));
          setFlashIds((s) => new Set(s).add(newOrder.id));
          setTimeout(() => {
            setFlashIds((s) => {
              const n = new Set(s);
              n.delete(newOrder.id);
              return n;
            });
          }, 1500);
          loadAll();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Package />} label="Orders Today" value={stats.ordersToday} />
        <StatCard
          icon={<IndianRupee />}
          label="Revenue Today"
          value={`₹${stats.revenueToday.toFixed(0)}`}
        />
        <StatCard icon={<Clock />} label="Pending" value={stats.pending} />
        <StatCard icon={<AlertTriangle />} label="Low Stock" value={stats.lowStock} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          to="/admin/products"
          className="rounded-2xl bg-primary p-3 text-center text-xs font-bold text-primary-foreground"
        >
          + Product
        </Link>
        <Link
          to="/admin/orders"
          className="rounded-2xl bg-secondary p-3 text-center text-xs font-bold text-secondary-foreground"
        >
          📋 Orders
        </Link>
        <Link
          to="/admin/slots"
          className="rounded-2xl bg-accent p-3 text-center text-xs font-bold text-accent-foreground"
        >
          🕐 Slots
        </Link>
      </div>

      <h3 className="mt-6 mb-2 font-display font-bold text-primary">Recent Orders</h3>
      <ul className="space-y-2">
        {recent.map((o) => (
          <motion.li
            key={o.id}
            animate={
              flashIds.has(o.id)
                ? { backgroundColor: ["oklch(0.93 0.06 152)", "oklch(0.96 0.04 95)"] }
                : {}
            }
            transition={{ duration: 1.5 }}
            className="rounded-2xl bg-card p-3"
          >
            <Link to="/admin/orders" className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-primary">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(o.created_at), "dd MMM HH:mm")} · {o.status}
                </p>
              </div>
              <p className="font-display font-bold text-accent">₹{o.total_amount.toFixed(0)}</p>
            </Link>
          </motion.li>
        ))}
        {recent.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No orders yet</p>
        )}
      </ul>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {icon}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold text-primary">{value}</p>
    </div>
  );
}
