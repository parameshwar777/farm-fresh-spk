import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Leaf, Sparkles, Truck } from "lucide-react";
import { supabase, type Category, type Product } from "@/integrations/supabase/client";
import { SpkLogo } from "@/components/SpkLogo";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

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
    <div className="min-h-[100dvh] pb-28">
      <TopBar />

      {/* HERO */}
      <section className="hero-gradient relative overflow-hidden px-6 pt-6 pb-10">
        {/* Floating decorative leaves */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-4 -left-4 text-5xl opacity-30"
          animate={{ y: [0, 10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          🌿
        </motion.div>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-10 right-2 text-4xl opacity-30"
          animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          🍃
        </motion.div>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-4 text-3xl opacity-25"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          🌱
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Animated logo */}
          <motion.div
            variants={fadeUp}
            className="relative"
            style={{ width: 180, height: 180 }}
          >
            {/* Rotating dashed ring */}
            <div className="absolute inset-0 ring-dashed-anim animate-spk-spin opacity-60" />
            {/* Soft pulsing halo */}
            <motion.div
              aria-hidden
              className="absolute inset-2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.85 0.16 90 / 0.45) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Logo with float */}
            <motion.div
              className="absolute inset-4 animate-spk-float"
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpkLogo size={148} className="logo-glow" />
            </motion.div>
            {/* Sparkle accents */}
            <motion.div
              className="absolute -top-1 right-3 text-secondary"
              animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-5 w-5 fill-secondary" />
            </motion.div>
            <motion.div
              className="absolute bottom-2 -left-1 text-accent"
              animate={{ rotate: [360, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Sparkles className="h-4 w-4 fill-accent" />
            </motion.div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-center font-display text-3xl font-extrabold leading-tight"
          >
            <span className="shimmer-text">SPK Natural Farming</span>
          </motion.h1>

          <motion.div
            variants={fadeUp}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1 backdrop-blur"
          >
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              Fresh From Farm
            </span>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={fadeUp}
            className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2"
          >
            {[
              { icon: <Leaf className="h-4 w-4" />, label: "100% Organic" },
              { icon: <Sparkles className="h-4 w-4" />, label: "SPK Method" },
              { icon: <Truck className="h-4 w-4" />, label: "Same-day" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-primary/10 bg-white/80 px-2 py-2.5 backdrop-blur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className="text-primary">{item.icon}</span>
                <span className="text-[10px] font-semibold text-primary text-center leading-tight">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-5">
            <Link to="/shop">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                Shop Today's Harvest
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Farm banner */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="-mt-4 mx-4 overflow-hidden rounded-3xl shadow-md ring-1 ring-primary/10"
      >
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
      </motion.section>

      {/* Categories */}
      <section className="mt-7 px-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Shop by Category</h2>
          <Link to="/shop" className="text-xs font-semibold text-accent">
            View all →
          </Link>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl bg-card" />
              ))
            : categories.map((cat) => (
                <motion.div
                  key={cat.id}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Link
                    to="/category/$categoryId"
                    params={{ categoryId: cat.id }}
                    className="relative flex h-24 flex-col items-start justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/80 to-secondary/40 p-3 shadow-sm ring-1 ring-primary/10"
                  >
                    <motion.span
                      className="text-3xl"
                      whileHover={{ scale: 1.2, rotate: -8 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {cat.emoji}
                    </motion.span>
                    <span className="font-display text-sm font-bold text-primary leading-tight">
                      {cat.name}
                    </span>
                    <ArrowRight className="absolute top-3 right-3 h-4 w-4 text-primary/60" />
                  </Link>
                </motion.div>
              ))}
        </motion.div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-7 px-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-lg font-bold text-primary">
              Today's Fresh Picks
            </h2>
            <span className="rounded-full bg-spk-badge px-2 py-0.5 text-[10px] font-bold text-spk-badge-fg">
              SPK METHOD
            </span>
          </div>
          <div className="scroll-hide -mx-4 overflow-x-auto px-4 pb-2">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex gap-3"
            >
              {featured.map((p) => (
                <motion.div key={p.id} variants={fadeUp} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/product/$productId"
                    params={{ productId: p.id }}
                    className="block w-36 flex-shrink-0 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-primary/5"
                  >
                    <div className="relative flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 text-5xl">
                      <motion.span
                        whileHover={{ scale: 1.15, rotate: 6 }}
                        transition={{ type: "spring", stiffness: 250 }}
                      >
                        {p.emoji}
                      </motion.span>
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-spk-badge px-1.5 py-0.5 text-[8px] font-bold text-spk-badge-fg">
                        SPK
                      </span>
                    </div>
                    <p className="mt-2 truncate font-semibold text-sm text-primary">
                      {p.name}
                    </p>
                    <p className="text-sm font-extrabold text-accent">₹{p.price}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
