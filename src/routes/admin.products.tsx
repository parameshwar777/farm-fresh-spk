import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, Upload, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProductImage } from "@/components/ProductImage";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Form = Partial<Product>;

const empty: Form = {
  name: "",
  emoji: "🥦",
  image_url: null,
  use_real_image: false,
  price: 0,
  unit: "per kg",
  stock_quantity: 0,
  farming_method: "SPK Method",
  is_available: true,
  is_featured: false,
  discount_percent: 0,
};

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Form | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("*").order("display_order"),
    ]);
    setProducts((p as Product[] | null) ?? []);
    setCategories((c as Category[] | null) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const startNew = () => {
    setEditing({ ...empty, category_id: categories[0]?.id });
    setOpen(true);
  };
  const startEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  const save = async () => {
    if (!editing || !editing.name || !editing.category_id) {
      toast.error("Name and category are required");
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description ?? null,
      price: Number(editing.price ?? 0),
      unit: editing.unit ?? "per kg",
      stock_quantity: Number(editing.stock_quantity ?? 0),
      category_id: editing.category_id,
      emoji: editing.emoji ?? "🥦",
      image_url: editing.image_url ?? null,
      use_real_image: editing.use_real_image ?? false,
      harvest_date: editing.harvest_date ?? null,
      farming_method: editing.farming_method ?? "SPK Method",
      is_available: editing.is_available ?? true,
      is_featured: editing.is_featured ?? false,
      discount_percent: Number(editing.discount_percent ?? 0),
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const toggleAvailable = async (p: Product) => {
    await supabase
      .from("products")
      .update({ is_available: !p.is_available })
      .eq("id", p.id);
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, is_available: !x.is_available } : x)),
    );
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onPickImage = async (file: File) => {
    if (!editing) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing({ ...editing, image_url: pub.publicUrl, use_real_image: true });
    setUploading(false);
    toast.success("Image uploaded");
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-primary">Products</h2>
        <Button
          onClick={startNew}
          className="rounded-full bg-primary text-primary-foreground"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ul className="space-y-2">
        {filtered.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <ProductImage
              product={p}
              className="h-12 w-12 bg-background"
              emojiClassName="text-2xl"
            />
            <div className="flex-1">
              <p className="font-semibold text-primary">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                ₹{p.price} · stock {p.stock_quantity}
                {p.use_real_image && p.image_url ? " · 📷" : ""}
              </p>
            </div>
            <Switch checked={p.is_available} onCheckedChange={() => toggleAvailable(p)} />
            <button onClick={() => startEdit(p)} className="text-primary">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => remove(p.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No products</p>
        )}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Edit Product" : "New Product"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <Input
                    value={editing.emoji ?? ""}
                    onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                  />
                </div>
              </div>

              {/* Image source toggle */}
              <div className="rounded-2xl border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Use real photo</Label>
                    <p className="text-xs text-muted-foreground">
                      Off = show emoji · On = show uploaded photo
                    </p>
                  </div>
                  <Switch
                    checked={editing.use_real_image ?? false}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, use_real_image: v })
                    }
                  />
                </div>

                {editing.use_real_image && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-card">
                      {editing.image_url ? (
                        <img
                          src={editing.image_url}
                          alt="Product"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onPickImage(f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        {uploading
                          ? "Uploading…"
                          : editing.image_url
                            ? "Replace Photo"
                            : "Upload Photo"}
                      </Button>
                      {editing.image_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ ...editing, image_url: null })
                          }
                          className="w-full text-xs text-destructive"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={editing.category_id}
                  onValueChange={(v) => setEditing({ ...editing, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={editing.price ?? 0}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={editing.unit ?? ""}
                    onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={editing.stock_quantity ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, stock_quantity: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Harvest Date</Label>
                  <Input
                    type="date"
                    value={editing.harvest_date ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, harvest_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    value={editing.discount_percent ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, discount_percent: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.is_featured ?? false}
                    onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.is_available ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_available: v })}
                  />
                  Available
                </label>
              </div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground">
                Save
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
