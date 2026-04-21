import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, type DeliverySlot } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/slots")({
  component: AdminSlots,
});

function AdminSlots() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [form, setForm] = useState({ slot_label: "", max_orders: 20 });

  const load = async () => {
    const { data } = await supabase
      .from("delivery_slots")
      .select("*")
      .eq("slot_date", date)
      .order("slot_label");
    setSlots((data as DeliverySlot[] | null) ?? []);
  };
  useEffect(() => {
    load();
  }, [date]);

  const add = async () => {
    if (!form.slot_label) return;
    const { error } = await supabase.from("delivery_slots").insert({
      ...form,
      slot_date: date,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    setForm({ slot_label: "", max_orders: 20 });
    load();
  };

  const toggle = async (s: DeliverySlot) => {
    await supabase.from("delivery_slots").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete slot?")) return;
    await supabase.from("delivery_slots").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Delivery Slots</h2>

      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="mt-3 rounded-2xl bg-card p-3">
        <div className="grid grid-cols-[1fr_80px_auto] gap-2">
          <div>
            <Label>Time label</Label>
            <Input
              placeholder="7 AM – 10 AM"
              value={form.slot_label}
              onChange={(e) => setForm({ ...form, slot_label: e.target.value })}
            />
          </div>
          <div>
            <Label>Max</Label>
            <Input
              type="number"
              value={form.max_orders}
              onChange={(e) => setForm({ ...form, max_orders: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={add} size="sm" className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {slots.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <div className="flex-1">
              <p className="font-semibold text-primary">{s.slot_label}</p>
              <p className="text-xs text-muted-foreground">
                {s.current_orders}/{s.max_orders} booked
              </p>
            </div>
            <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
            <button onClick={() => remove(s.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {slots.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No slots for this date</p>
        )}
      </ul>
    </div>
  );
}
