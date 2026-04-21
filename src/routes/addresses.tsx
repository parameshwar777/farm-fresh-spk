import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Address } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/addresses")({
  component: AddressesPage,
});

function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_address: "", city: "", pincode: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    setAddresses((data as Address[] | null) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!/^\d{6}$/.test(form.pincode)) {
      toast.error("Pincode must be 6 digits");
      return;
    }
    const { error } = await supabase.from("addresses").insert({
      ...form,
      user_id: user.id,
      is_default: addresses.length === 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setShowForm(false);
    setForm({ label: "Home", full_address: "", city: "", pincode: "" });
    toast.success("Address added");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-[100dvh] pb-12">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-card">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">
          Addresses
        </h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-4">
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between rounded-2xl bg-card p-4"
            >
              <div>
                <p className="font-semibold text-primary">{a.label}</p>
                <p className="text-sm text-muted-foreground">
                  {a.full_address}, {a.city} - {a.pincode}
                </p>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mt-4 w-full rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> Add address
          </Button>
        )}

        {showForm && (
          <div className="mt-4 space-y-3 rounded-2xl bg-card p-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={form.pincode}
                  maxLength={6}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
            <div>
              <Label>Full Address</Label>
              <Input
                value={form.full_address}
                onChange={(e) => setForm({ ...form, full_address: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="flex-1 bg-primary text-primary-foreground">
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
