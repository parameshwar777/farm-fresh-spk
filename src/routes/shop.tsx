import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { useCachedQuery } from "@/hooks/useSupabaseCache";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/ProductImage";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
});

async function fetchShopCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return (data as Category[] | null) ?? [];
}

async function fetchShopProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .order("name");
  return (data as Product[] | null) ?? [];
}

function ShopPage() {
  const { data: catData, loading: catLoading } = useCachedQuery(
    "shop:categories",
    fetchShopCategories,
  );
  const { data: prodData } = useCachedQuery("shop:products", fetchShopProducts);
  const categories = catData ?? [];
  const products = prodData ?? [];
  const loading = catLoading && categories.length === 0;

  return (
    <div className="min-h-[100dvh] pb-bottom-nav">
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
        <ProductImage
          product={product}
          className="h-14 w-14 bg-background"
          emojiClassName="text-3xl"
        />
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
