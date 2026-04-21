import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { SpkLogo } from "@/components/SpkLogo";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .eq("is_featured", true)
          .limit(8),
      ]);
      setCategories((cats as Category[] | null) ?? []);
      setFeatured((prods as Product[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] pb-24">
      <TopBar />

      {/* Logo splash */}
      <section className="flex flex-col items-center px-6 pt-6 pb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <SpkLogo size={140} className="shadow-lg" />
        </motion.div>
        <h1 className="mt-3 text-center font-display text-2xl font-bold text-primary">
          SPK Natural Farming
        </h1>
        <p className="text-sm text-muted-foreground">Fresh From Farm</p>
      </section>

      {/* Farm banner */}
      <section className="mx-4 overflow-hidden rounded-3xl shadow-sm">
        <div className="farm-banner relative h-36 w-full">
          <svg
            viewBox="0 0 400 144"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="320" cy="40" r="28" fill="#FFD93D" opacity="0.95" />
            <g opacity="0.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <line
                  key={i}
                  x1="320"
                  y1="40"
                  x2={320 + Math.cos((i * Math.PI) / 4) * 50}
                  y2={40 + Math.sin((i * Math.PI) / 4) * 50}
                  stroke="#FFD93D"
                  strokeWidth="3"
                />
              ))}
            </g>
            <path d="M0 110 Q100 70 200 95 T400 80 V144 H0 Z" fill="#52796F" opacity="0.85" />
            <path d="M0 125 Q120 100 240 115 T400 110 V144 H0 Z" fill="#1B4332" />
            <g fill="#1B4332">
              <circle cx="60" cy="105" r="6" />
              <rect x="58" y="105" width="4" height="14" />
              <circle cx="140" cy="100" r="7" />
              <rect x="138" y="100" width="4" height="16" />
              <circle cx="240" cy="103" r="6" />
              <rect x="238" y="103" width="4" height="14" />
            </g>
          </svg>
          <div className="relative flex h-full items-end p-4">
            <div>
              <p className="font-display text-lg font-bold text-primary text-shadow-sm">
                Today's Harvest
              </p>
              <p className="text-xs text-primary/80">Hand-picked, naturally grown</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category buttons */}
      <section className="mt-6 px-4">
        <h2 className="mb-3 font-display text-lg font-bold text-primary">Shop by Category</h2>
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-full bg-card" />
              ))
            : categories.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    to="/category/$categoryId"
                    params={{ categoryId: cat.id }}
                    className="flex w-full items-center justify-between rounded-full bg-secondary px-6 py-4 shadow-sm"
                  >
                    <span className="flex items-center gap-3 font-display text-base font-bold text-primary">
                      <span className="text-2xl">{cat.emoji}</span>
                      {cat.name}
                    </span>
                    <span className="text-primary">→</span>
                  </Link>
                </motion.div>
              ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-6 px-4">
          <h2 className="mb-3 font-display text-lg font-bold text-primary">
            Today's Fresh Picks
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex gap-3">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$productId"
                  params={{ productId: p.id }}
                  className="w-32 flex-shrink-0 rounded-2xl bg-card p-3 shadow-sm"
                >
                  <div className="flex h-20 items-center justify-center text-5xl">{p.emoji}</div>
                  <p className="mt-2 truncate font-semibold text-sm text-primary">{p.name}</p>
                  <p className="text-xs font-bold text-accent">₹{p.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
