import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase, type Product } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/store/cart";
import { ProductImage } from "@/components/ProductImage";
import { useAppBack } from "@/hooks/useAppBack";

export const Route = createFileRoute("/product/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { goBack } = useAppBack("/shop");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      setProduct(data as Product | null);
      setLoading(false);
    })();
  }, [productId]);

  const handleAdd = () => {
    if (!product) return;
    add(
      {
        productId: product.id,
        name: product.name,
        emoji: product.emoji,
        price: product.price,
        unit: product.unit,
      },
      qty,
    );
    toast.success(`${product.name} added to cart`);
    navigate({ to: "/cart" });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] p-4">
        <Skeleton className="h-9 w-9 rounded-full bg-card" />
        <Skeleton className="mx-auto mt-6 h-40 w-40 rounded-full bg-card" />
        <Skeleton className="mx-auto mt-4 h-6 w-40 bg-card" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl">🥲</div>
          <p className="mt-3 font-display font-bold text-primary">Product not found</p>
          <Link to="/shop" className="mt-3 inline-block text-sm font-semibold text-accent">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-32">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => goBack("/shop")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">
          {product.name}
        </h1>
        <div className="w-9" />
      </header>

      <div className="px-6 py-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto"
        >
          <ProductImage
            product={product}
            className={
              product.use_real_image && product.image_url
                ? "mx-auto h-72 w-full max-w-sm bg-card shadow-lg"
                : "mx-auto h-56 w-56 bg-card shadow-lg"
            }
            emojiClassName="text-9xl"
            rounded={product.use_real_image && product.image_url ? "3xl" : "full"}
          />
        </motion.div>

        <h2 className="mt-6 text-center font-display text-2xl font-bold text-primary">
          {product.name}
        </h2>
        <p className="text-center text-sm font-semibold text-success">SPK Natural Farming</p>
        {product.harvest_date && (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Harvested on {format(new Date(product.harvest_date), "dd MMM yyyy")}
          </p>
        )}

        <div className="mt-3 flex justify-center">
          <span className="rounded-full bg-spk-badge px-3 py-1 text-xs font-semibold text-spk-badge-fg">
            🌿 {product.farming_method}
          </span>
        </div>

        <p className="mt-4 text-center font-display text-3xl font-bold text-accent">
          ₹{product.price}
          <span className="text-base font-normal text-muted-foreground"> {product.unit}</span>
        </p>

        {product.description && (
          <p className="mt-4 rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 rounded-full border-2 border-primary bg-background p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-card"
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-display font-bold text-primary">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-card"
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-background/95 p-3 backdrop-blur">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAdd}
          className="h-12 w-full rounded-full bg-primary font-display text-base font-bold text-primary-foreground shadow-md"
        >
          Add to Cart · ₹{(product.price * qty).toFixed(0)}
        </motion.button>
      </div>
    </div>
  );
}
