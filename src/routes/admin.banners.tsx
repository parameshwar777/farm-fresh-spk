import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const Route = createFileRoute("/admin/banners")({
  component: AdminBanners,
});

function AdminBanners() {
  const [list, setList] = useState<Banner[]>([]);
  const [form, setForm] = useState({ title: "", subtitle: "", image_url: "" });

  const load = async () => {
    const { data } = await supabase.from("banners").select("*").order("display_order");
    setList((data as Banner[] | null) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.title) return;
    const { error } = await supabase.from("banners").insert({
      ...form,
      display_order: list.length + 1,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", subtitle: "", image_url: "" });
    load();
  };
  const toggle = async (b: Banner) => {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Banners</h2>

      <div className="rounded-2xl bg-card p-3 space-y-2">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
        <div>
          <Label>Image URL</Label>
          <Input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />
        </div>
        <Button onClick={add} className="w-full bg-primary text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> Add Banner
        </Button>
      </div>

      <ul className="mt-3 space-y-2">
        {list.map((b) => (
          <li key={b.id} className="rounded-2xl bg-card p-3">
            <div className="flex items-center gap-3">
              {b.image_url && (
                <img src={b.image_url} alt={b.title} className="h-12 w-12 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-primary">{b.title}</p>
                {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
              </div>
              <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
              <button onClick={() => remove(b.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No banners yet</p>
        )}
      </ul>
    </div>
  );
}
