import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
});

function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
        supabase.from("products").select("*").eq("is_available", true).order("name"),
      ]);
      setCategories((cats as Category[] | null) ?? []);
      setProducts((prods as Product[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] pb-24">
      <TopBar />
      <div className="px-4 py-4">
        <h1 className="mb-3 font-display text-2xl font-bold text-primary">Shop</h1>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl bg-card" />
            ))}
          </div>
        ) : (
          <>
            {categories.map((cat) => {
              const items = products.filter((p) => p.category_id === cat.id);
              if (items.length === 0) return null;
              return (
                <section key={cat.id} className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-primary">
                      <span className="mr-2">{cat.emoji}</span>
                      {cat.name}
                    </h2>
                    <Link
                      to="/category/$categoryId"
                      params={{ categoryId: cat.id }}
                      className="text-sm font-semibold text-accent"
                    >
                      See all →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {items.slice(0, 3).map((p, i) => (
                      <ProductRow key={p.id} product={p} index={i} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ProductRow({ product, index }: { product: Product; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to="/product/$productId"
        params={{ productId: product.id }}
        className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background text-3xl">
          {product.emoji}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-primary">{product.name}</p>
          <span className="mt-0.5 inline-block rounded-full bg-spk-badge px-2 py-0.5 text-[10px] font-semibold text-spk-badge-fg">
            SPK Method
          </span>
        </div>
        <p className="font-display font-bold text-accent">
          ₹{product.price}
          <span className="text-xs text-muted-foreground">/{product.unit.replace("per ", "")}</span>
        </p>
      </Link>
    </motion.div>
  );
}
