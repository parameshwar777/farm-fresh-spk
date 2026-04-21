import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import {
  supabase,
  type Address,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
  type Profile,
} from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// Admin's WhatsApp number — change here if needed
const ADMIN_WHATSAPP = "919440229378"; // 91 = India country code

type EnrichedOrder = Order & {
  items: (OrderItem & { product?: Pick<Product, "name" | "emoji" | "unit"> })[];
  address: Address | null;
  customer: Pick<Profile, "full_name" | "phone" | "phone_number"> | null;
};

function AdminOrders() {
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        `*,
         items:order_items(*, product:products(name, emoji, unit)),
         address:addresses(*),
         customer:profiles!orders_user_id_fkey(full_name, phone, phone_number)
        `,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data as unknown as EnrichedOrder[] | null) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-all-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Updated");
  };

  const sendWhatsApp = (o: EnrichedOrder) => {
    const lines: string[] = [];
    lines.push(`*🌿 SPK Order #${o.id.slice(0, 8)}*`);
    lines.push(`📅 ${format(new Date(o.created_at), "dd MMM yyyy, hh:mm a")}`);
    lines.push("");
    lines.push(`*Customer:* ${o.customer?.full_name ?? "—"}`);
    const phone =
      o.customer?.phone_number || o.customer?.phone || o.address?.receiver_phone || "—";
    lines.push(`*Phone:* ${phone}`);
    if (o.address) {
      lines.push(`*Receiver:* ${o.address.receiver_name} (${o.address.receiver_phone})`);
      lines.push(
        `*Address:* ${o.address.label} — ${o.address.full_address}, ${o.address.city} - ${o.address.pincode}`,
      );
    }
    lines.push("");
    lines.push(`*Items:*`);
    o.items?.forEach((it) => {
      const name = it.product?.name ?? "Item";
      const emoji = it.product?.emoji ?? "•";
      lines.push(
        `${emoji} ${name} × ${it.quantity} ${it.unit} — ₹${(it.price_at_time * it.quantity).toFixed(0)}`,
      );
    });
    lines.push("");
    lines.push(`*Total:* ₹${o.total_amount.toFixed(0)}`);
    lines.push(
      `*Payment:* ${o.payment_method.toUpperCase()} (${o.payment_status})`,
    );
    lines.push(`*Status:* ${o.status.replace(/_/g, " ")}`);
    if (o.notes?.startsWith("[slot]")) {
      lines.push(`*Slot:* ${o.notes.replace("[slot] ", "")}`);
    }

    const text = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Orders</h2>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ul className="mt-3 space-y-2">
        {visible.map((o) => (
          <li key={o.id} className="rounded-2xl bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">
                  #{o.id.slice(0, 8)}
                  {o.customer?.full_name ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · {o.customer.full_name}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(o.created_at), "dd MMM HH:mm")}
                </p>
                {o.items && o.items.length > 0 && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {o.items
                      .map(
                        (it) => `${it.product?.name ?? "Item"} ×${it.quantity}`,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="font-display font-bold text-accent">
                  ₹{o.total_amount.toFixed(0)}
                </p>
                <button
                  onClick={() => sendWhatsApp(o)}
                  aria-label="Share on WhatsApp"
                  title="Share on WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <Select
                value={o.status}
                onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No orders</p>
        )}
      </ul>
    </div>
  );
}
