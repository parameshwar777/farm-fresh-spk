import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/store/cart";
import { ProductImage } from "@/components/ProductImage";

export const Route = createFileRoute("/category/$categoryId")({
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = Route.useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const add = useCart((s) => s.add);

  useEffect(() => {
    (async () => {
      const [{ data: cat }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("*").eq("id", categoryId).maybeSingle(),
        supabase
          .from("products")
          .select("*")
          .eq("category_id", categoryId)
          .eq("is_available", true)
          .order("name"),
      ]);
      setCategory(cat as Category | null);
      setProducts((prods as Product[] | null) ?? []);
      setLoading(false);
    })();
  }, [categoryId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedToCart = () => {
    const items = products.filter((p) => selected.has(p.id));
    items.forEach((p) =>
      add({
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        price: p.price,
        unit: p.unit,
      }),
    );
    toast.success(`Added ${items.length} item(s) to cart`);
    setSelected(new Set());
    navigate({ to: "/cart" });
  };

  return (
    <div className="min-h-[100dvh] pb-32">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">
          {category ? `${category.emoji} ${category.name}` : "Loading…"}
        </h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl bg-card" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl">🌱</div>
            <p className="mt-3 font-display font-bold text-primary">No items yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for fresh harvest!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {products.map((p, i) => {
              const isSelected = selected.has(p.id);
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className={`flex items-center gap-3 rounded-2xl border-2 bg-card p-3 shadow-sm transition-colors ${
                      isSelected ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => toggle(p.id)}
                      aria-label={`Select ${p.name}`}
                      className="shrink-0"
                    >
                      <ProductImage
                        product={p}
                        className="h-14 w-14 bg-background"
                        emojiClassName="text-3xl"
                      />
                    </button>
                    <Link
                      to="/product/$productId"
                      params={{ productId: p.id }}
                      className="flex-1"
                    >
                      <p className="font-semibold text-primary">{p.name}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-spk-badge px-2 py-0.5 text-[10px] font-semibold text-spk-badge-fg">
                        SPK Method
                      </span>
                    </Link>
                    <div className="text-right">
                      <p className="font-display font-bold text-accent">₹{p.price}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.unit.replace("per ", "/")}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {selected.size > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-background/95 p-3 backdrop-blur">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addSelectedToCart}
            className="h-12 w-full rounded-full bg-primary font-display text-base font-bold text-primary-foreground shadow-md"
          >
            Add {selected.size} item{selected.size > 1 ? "s" : ""} to Cart
          </motion.button>
        </div>
      )}
    </div>
  );
}
