import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer, FileDown, Truck, CheckCircle2, LogOut, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  const load = async () => {
    setLoading(true);
    // Paid orders only
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_status", "paid")
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
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canAccess]);

  const markDelivered = async (id: string) => {
    if (!confirm("Mark this order as DELIVERED?")) return;
    setBusyId(id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else toast.success("Marked as delivered");
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
            <Link to="/" className="text-xs text-accent-foreground/80 underline">
              Customer
            </Link>
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
            onClick={load}
            className="flex h-10 items-center justify-center rounded-2xl bg-card px-3 text-primary"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk actions */}
        {tab === "to_deliver" && filtered.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 print:hidden">
            <button
              onClick={() => printBulk(filtered)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Printer className="h-3.5 w-3.5" /> Print all ({filtered.length})
            </button>
            <button
              onClick={() => downloadBulkPDF(filtered)}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground"
            >
              <FileDown className="h-3.5 w-3.5" /> Download bulk PDF
            </button>
          </div>
        )}

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
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => printSlip(order)}
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button
          onClick={() => downloadSlipPDF(order)}
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground"
        >
          <FileDown className="h-3.5 w-3.5" /> PDF
        </button>
        {showDeliverBtn && (
          <button
            onClick={onDeliver}
            disabled={busy}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-success px-4 py-1.5 text-xs font-bold text-success-foreground disabled:opacity-60"
          >
            {busy ? (
              "..."
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
              </>
            )}
          </button>
        )}
        {!showDeliverBtn && order.status === "delivered" && (
          <span className="ml-auto flex items-center gap-1 text-xs font-bold text-success">
            <Truck className="h-3.5 w-3.5" /> Delivered
          </span>
        )}
      </div>
    </li>
  );
}

// =============== PDF / Print helpers ===============

function buildSlipPDF(orders: EnrichedOrder[], title: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  orders.forEach((o, idx) => {
    if (idx > 0) doc.addPage();

    // Header
    doc.setFillColor(27, 67, 50);
    doc.rect(0, 0, pageWidth, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SPK Natural Farming", 40, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Fresh from farm — delivery slip", 40, 46);

    doc.setTextColor(0, 0, 0);

    // Order info
    let y = 90;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Order #${o.id.slice(0, 8).toUpperCase()}`, 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(format(new Date(o.created_at), "dd MMM yyyy · HH:mm"), pageWidth - 40, y, {
      align: "right",
    });

    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Customer", 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 14;
    doc.text(o.customer?.full_name || "(no name)", 40, y);
    if (o.customer?.phone_number || o.customer?.phone) {
      y += 13;
      doc.text(`Phone: ${o.customer.phone_number || o.customer.phone}`, 40, y);
    }
    if (o.address) {
      y += 13;
      const addrLines = doc.splitTextToSize(
        `Address: ${o.address.full_address}, ${o.address.city} - ${o.address.pincode}`,
        pageWidth - 80,
      );
      doc.text(addrLines, 40, y);
      y += addrLines.length * 13;
    }

    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Unit", "Price", "Total"]],
      body: o.items.map((it) => [
        it.product_name,
        String(it.quantity),
        it.unit,
        `Rs. ${Number(it.price_at_time).toFixed(0)}`,
        `Rs. ${(Number(it.price_at_time) * Number(it.quantity)).toFixed(0)}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [27, 67, 50] },
      styles: { fontSize: 10 },
    });

    type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };
    const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? y + 100;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total: Rs. ${Number(o.total_amount).toFixed(0)}`, pageWidth - 40, finalY + 22, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Payment: ${o.payment_method.toUpperCase()} · ${o.payment_status.toUpperCase()}`,
      40,
      finalY + 22,
    );

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${title} · Page ${idx + 1} of ${orders.length}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
    doc.setTextColor(0, 0, 0);
  });

  return doc;
}

function downloadSlipPDF(order: EnrichedOrder) {
  const doc = buildSlipPDF([order], "Delivery slip");
  doc.save(`order-${order.id.slice(0, 8)}.pdf`);
}

function downloadBulkPDF(orders: EnrichedOrder[]) {
  const doc = buildSlipPDF(orders, "Bulk delivery slips");
  doc.save(`delivery-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}

function openPrint(doc: jsPDF) {
  const blobUrl = doc.output("bloburl");
  const w = window.open(blobUrl, "_blank");
  if (w) {
    w.addEventListener("load", () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* user can print manually */
      }
    });
  } else {
    toast.error("Pop-up blocked. Please allow pop-ups to print.");
  }
}

function printSlip(order: EnrichedOrder) {
  openPrint(buildSlipPDF([order], "Delivery slip"));
}

function printBulk(orders: EnrichedOrder[]) {
  openPrint(buildSlipPDF(orders, "Bulk delivery slips"));
}
