import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, ShoppingBag, MapPin, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setOrderCount(count ?? 0));
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-[100dvh] pb-24">
        <TopBar />
        <div className="px-4 py-6 text-center">
          <p className="text-muted-foreground">Sign in to view your profile</p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign In
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const initials =
    (profile?.full_name ?? user.email ?? "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const handleLogout = async () => {
    if (!confirm("Sign out of SPK Natural Farming?")) return;
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-[100dvh] pb-24">
      <TopBar />
      <div className="px-4 py-4">
        <div className="flex flex-col items-center rounded-3xl bg-card p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
          <h1 className="mt-3 font-display text-xl font-bold text-primary">
            {profile?.full_name || user.email}
          </h1>
          {profile?.phone && (
            <p className="text-sm text-muted-foreground">{profile.phone}</p>
          )}
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-3 rounded-full bg-spk-badge px-3 py-1 text-xs font-bold text-spk-badge-fg">
            {orderCount} order{orderCount === 1 ? "" : "s"}
          </div>
          {profile?.role === "admin" && (
            <Link
              to="/admin"
              className="mt-3 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground"
            >
              Open Admin Panel
            </Link>
          )}
        </div>

        <ul className="mt-4 space-y-2">
          <ProfileLink to="/orders" icon={<ShoppingBag className="h-5 w-5" />} label="My Orders" />
          <ProfileLink to="/addresses" icon={<MapPin className="h-5 w-5" />} label="Addresses" />
          <li>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-semibold">Sign out</span>
            </button>
          </li>
        </ul>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Settings className="mr-1 inline h-3 w-3" />
          SPK Natural Farming · Fresh from farm
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

function ProfileLink({
  to,
  icon,
  label,
}: {
  to: "/orders" | "/addresses";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-2xl bg-card p-4 font-semibold text-primary"
      >
        {icon}
        {label}
        <span className="ml-auto text-muted-foreground">→</span>
      </Link>
    </li>
  );
}
