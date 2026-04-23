import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/store/cart";
import { motion } from "framer-motion";

export function BottomNav() {
  const location = useLocation();
  const count = useCart((s) => s.totalItems());

  const items: Array<{
    to: "/" | "/shop" | "/cart" | "/profile";
    icon: typeof Home;
    label: string;
    badge?: number;
  }> = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/shop", icon: ShoppingBag, label: "Shop" },
    { to: "/cart", icon: ShoppingCart, label: "Cart", badge: count },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-background/95 backdrop-blur"
      aria-label="Bottom navigation"
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-1">
        {items.map(({ to, icon: Icon, label, badge }) => {
          const active =
            to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                preload="intent"
                preloadDelay={0}
                className="relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                      {badge}
                    </span>
                  ) : null}
                </motion.div>
                <span className={active ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
