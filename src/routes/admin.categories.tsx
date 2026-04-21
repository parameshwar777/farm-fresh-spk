import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Category } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const [list, setList] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", emoji: "🥦" });

  const load = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    setList((data as Category[] | null) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.name) return;
    const { error } = await supabase
      .from("categories")
      .insert({ ...form, display_order: list.length + 1 });
    if (error) return toast.error(error.message);
    setForm({ name: "", emoji: "🥦" });
    toast.success("Added");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete category?")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Categories</h2>

      <div className="rounded-2xl bg-card p-3">
        <div className="grid grid-cols-[1fr_60px_auto] gap-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Emoji</Label>
            <Input
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
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
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <span className="text-2xl">{c.emoji}</span>
            <p className="flex-1 font-semibold text-primary">{c.name}</p>
            <button onClick={() => remove(c.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
