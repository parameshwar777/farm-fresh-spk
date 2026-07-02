import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, LogOut, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Order, type OrderItem, type Address, type Profile } from "@/integrations/supabase/client";
import { signOut, useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/merchant")({
  component: MerchantPortal,
});

type EnrichedOrder = Order & {
  items: (OrderItem & { product_name: string; product_emoji: string })[];
  customer: Pick<Profile, "full_name" | "phone" | "phone_number" | "email"> | null;
  address: Address | null;
};

function MerchantPortal() {
  const { user, isAdmin, isMerchant, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"to_deliver" | "delivered">("to_deliver");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const canAccess = !!user && (isMerchant || isAdmin);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    // Show paid online orders plus COD orders awaiting cash collection.
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .or("payment_status.eq.paid,payment_method.eq.cod")
      .order("created_at", { ascending: false })
      .limit(200);

    if (ordersErr) {
      toast.error(ordersErr.message);
      setLoading(false);
      return;
    }
    const baseOrders = (ordersData as Order[] | null) ?? [];
    if (baseOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = baseOrders.map((o) => o.id);
    const userIds = Array.from(new Set(baseOrders.map((o) => o.user_id)));
    const addressIds = Array.from(
      new Set(baseOrders.map((o) => o.address_id).filter(Boolean)),
    ) as string[];

    const [{ data: itemsData }, { data: profilesData }, { data: addressesData }] = await Promise.all([
      supabase
        .from("order_items")
        .select("*, products(name, emoji)")
        .in("order_id", orderIds),
      supabase
        .from("profiles")
        .select("id, full_name, phone, phone_number, email")
        .in("id", userIds),
      addressIds.length > 0
        ? supabase.from("addresses").select("*").in("id", addressIds)
        : Promise.resolve({ data: [] as Address[] }),
    ]);

    type ItemRow = OrderItem & { products: { name: string; emoji: string } | null };
    const itemsByOrder = new Map<string, EnrichedOrder["items"]>();
    ((itemsData as ItemRow[] | null) ?? []).forEach((it) => {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push({
        ...it,
        product_name: it.products?.name ?? "Item",
        product_emoji: it.products?.emoji ?? "📦",
      });
      itemsByOrder.set(it.order_id, arr);
    });

    const profileById = new Map<string, Profile>();
    ((profilesData as Profile[] | null) ?? []).forEach((p) => profileById.set(p.id, p));

    const addressById = new Map<string, Address>();
    ((addressesData as Address[] | null) ?? []).forEach((a) => addressById.set(a.id, a));

    setOrders(
      baseOrders.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) ?? [],
        customer: profileById.get(o.user_id) ?? null,
        address: o.address_id ? addressById.get(o.address_id) ?? null : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!canAccess) return;
    load();
    const ch = supabase
      .channel("merchant-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(true),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canAccess]);

  const markDelivered = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", payment_status: "paid" })
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else toast.success("Cash collected · delivered");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) =>
        tab === "delivered" ? o.status === "delivered" : o.status !== "delivered" && o.status !== "cancelled",
      )
      .filter((o) => {
        if (!q) return true;
        const hay = [
          o.id,
          o.customer?.full_name,
          o.customer?.phone,
          o.customer?.phone_number,
          o.address?.full_address,
          o.address?.city,
          o.address?.pincode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [orders, tab, query]);

  const handleLogout = async () => {
    if (!confirm("Sign out?")) return;
    await signOut();
    window.location.href = "/login";
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    throw redirect({ to: "/login" });
  }

  if (!isMerchant && !isAdmin) {
    throw redirect({ to: "/" });
  }

  return (
    <div className="min-h-[100dvh] pb-20">
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-accent px-4 py-3 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-accent-foreground">SPK Merchant</h1>
            <p className="text-[10px] text-accent-foreground/80">Delivery panel</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell tone="accent" />
            <button
              onClick={handleLogout}
              className="rounded-full bg-accent-foreground/10 p-2 text-accent-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Tabs */}
        <div className="mb-3 flex rounded-full bg-muted p-1 print:hidden">
          {(
            [
              { id: "to_deliver", label: "To deliver" },
              { id: "delivered", label: "Delivered" },
            ] as const
          ).map((t) => {
            const count = orders.filter((o) =>
              t.id === "delivered"
                ? o.status === "delivered"
                : o.status !== "delivered" && o.status !== "cancelled",
            ).length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search + actions */}
        <div className="mb-3 flex gap-2 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, address…"
              className="h-10 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => load()}
            className="flex h-10 items-center justify-center rounded-2xl bg-card px-3 text-primary"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === "to_deliver" ? "No orders to deliver 🎉" : "No delivered orders yet"}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onDeliver={() => markDelivered(o.id)}
                busy={busyId === o.id}
                showDeliverBtn={tab === "to_deliver"}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onDeliver,
  busy,
  showDeliverBtn,
}: {
  order: EnrichedOrder;
  onDeliver: () => void;
  busy: boolean;
  showDeliverBtn: boolean;
}) {
  return (
    <li className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-primary">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(order.created_at), "dd MMM yyyy · HH:mm")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-accent">
            ₹{Number(order.total_amount).toFixed(0)}
          </p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
              order.status === "delivered"
                ? "bg-success text-success-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-3 rounded-xl bg-muted/50 p-2.5 text-xs">
        <p className="font-semibold text-primary">
          👤 {order.customer?.full_name || "(no name)"}
        </p>
        {(order.customer?.phone_number || order.customer?.phone) && (
          <p className="text-muted-foreground">
            📞 {order.customer.phone_number || order.customer.phone}
          </p>
        )}
        {order.address && (
          <p className="mt-1 text-muted-foreground">
            📍 {order.address.full_address}, {order.address.city} - {order.address.pincode}
          </p>
        )}
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1 text-xs">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between">
            <span>
              {it.product_emoji} {it.product_name}{" "}
              <span className="text-muted-foreground">× {Number(it.quantity)}</span>
            </span>
            <span className="font-semibold">
              ₹{(Number(it.price_at_time) * Number(it.quantity)).toFixed(0)}
            </span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="mt-4 print:hidden">
        {showDeliverBtn && (
          <button
            onClick={onDeliver}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-success text-sm font-extrabold text-success-foreground shadow-sm disabled:opacity-60"
          >
            {busy ? (
              "Updating..."
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" /> Cash collected & delivered
              </>
            )}
          </button>
        )}
        {!showDeliverBtn && order.status === "delivered" && (
          <span className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-spk-badge text-sm font-bold text-spk-badge-fg">
            <CheckCircle2 className="h-4 w-4" /> Delivered · cash collected
          </span>
        )}
      </div>
    </li>
  );
}
