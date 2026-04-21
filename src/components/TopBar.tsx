import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { SpkLogo } from "./SpkLogo";
import { useCart } from "@/store/cart";

export function TopBar() {
  const count = useCart((s) => s.totalItems());

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <SpkLogo size={36} />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-primary">SPK Natural Farming</p>
            <p className="text-[10px] text-muted-foreground">Fresh From Farm</p>
          </div>
        </Link>
        <Link to="/cart" className="relative" aria-label="Cart">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
          >
            <ShoppingCart className="h-5 w-5 text-primary" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">
                {count}
              </span>
            )}
          </motion.div>
        </Link>
      </div>
    </header>
  );
}
