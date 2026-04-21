import { Link, Outlet, useLocation, redirect, createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Clock, Image, Settings as SettingsIcon, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function AdminLayout() {
  const location = useLocation();
  const navItems: Array<{
    to: "/admin" | "/admin/products" | "/admin/categories" | "/admin/orders" | "/admin/slots" | "/admin/banners" | "/admin/settings";
    icon: typeof LayoutDashboard;
    label: string;
    exact?: boolean;
  }> = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/categories", icon: Folder, label: "Categories" },
    { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/admin/slots", icon: Clock, label: "Slots" },
    { to: "/admin/banners", icon: Image, label: "Banners" },
    { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="min-h-[100dvh] pb-20">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-primary px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-primary-foreground">SPK Admin</h1>
          <Link to="/" className="text-xs text-primary-foreground/80 underline">
            Customer view
          </Link>
        </div>
      </header>

      <main className="px-4 py-4">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] overflow-x-auto border-t border-border bg-background/95 backdrop-blur">
        <ul className="flex">
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <li key={to} className="flex-shrink-0">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] ${
                    active ? "text-primary" : "text-muted-foreground"
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
    </div>
  );
}
