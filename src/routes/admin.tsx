import { Link, Outlet, useLocation, redirect, createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Clock, Image, Settings as SettingsIcon, Folder, Users, Home, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

const NAV_ITEMS: Array<{
  to: "/admin" | "/admin/products" | "/admin/categories" | "/admin/orders" | "/admin/slots" | "/admin/banners" | "/admin/settings" | "/admin/users";
  icon: typeof LayoutDashboard;
  label: string;
  exact?: boolean;
}> = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/categories", icon: Folder, label: "Categories" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/slots", icon: Clock, label: "Slots" },
  { to: "/admin/banners", icon: Image, label: "Banners" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

function AdminLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-primary px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate font-display text-lg font-bold text-primary-foreground">
            SPK Admin
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell tone="primary" />
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground"
              aria-label="Back to customer view"
            >
              <Home className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-12">
        <Outlet />
      </main>

      {/* Slide-in drawer (mobile-first) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="safe-top safe-bottom absolute left-0 top-0 h-full w-[78%] max-w-[300px] overflow-y-auto bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
              <h2 className="font-display text-base font-bold text-primary-foreground">
                Admin Panel
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="p-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
                  const active = exact
                    ? location.pathname === to
                    : location.pathname.startsWith(to);
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-card"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
