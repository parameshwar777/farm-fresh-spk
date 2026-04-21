import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase, type Order, type OrderStatus } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders;
});

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data as Order[] | null) ?? []);
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
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-primary">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(o.created_at), "dd MMM HH:mm")}
                </p>
              </div>
              <p className="font-display font-bold text-accent">₹{o.total_amount.toFixed(0)}</p>
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
