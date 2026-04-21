import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Truck, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Profile } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Role = "customer" | "admin" | "merchant";

const ROLE_META: Record<Role, { label: string; color: string; icon: typeof UserIcon }> = {
  customer: { label: "Customer", color: "bg-muted text-muted-foreground", icon: UserIcon },
  admin: { label: "Admin", color: "bg-primary text-primary-foreground", icon: Shield },
  merchant: { label: "Merchant", color: "bg-accent text-accent-foreground", icon: Truck },
};

function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setUsers((data as Profile[] | null) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (!q) return true;
      const hay = [u.full_name, u.email, u.phone, u.phone_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, query, filter]);

  const setRole = async (id: string, role: Role) => {
    setBusyId(id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Role updated to ${role}`);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-bold text-primary">Users & Roles</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Promote a user to <span className="font-semibold">Admin</span> (full access) or{" "}
        <span className="font-semibold">Merchant</span> (delivery panel only).
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or phone…"
          className="h-11 w-full rounded-2xl border border-border bg-card pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "customer", "admin", "merchant"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              filter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {r}
            {r !== "all" && (
              <span className="ml-1 opacity-70">
                ({users.filter((u) => u.role === r).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((u) => {
            const Meta = ROLE_META[u.role];
            const Icon = Meta.icon;
            return (
              <li key={u.id} className="rounded-2xl bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary">
                      {u.full_name || "(no name)"}
                    </p>
                    {u.email && (
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    )}
                    {(u.phone_number || u.phone) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {u.phone_number || u.phone}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${Meta.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    {Meta.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["customer", "admin", "merchant"] as const).map((r) => {
                    const isCurrent = u.role === r;
                    return (
                      <button
                        key={r}
                        disabled={isCurrent || busyId === u.id}
                        onClick={() => {
                          if (
                            confirm(
                              `Change ${u.full_name || u.email || "this user"} to ${r.toUpperCase()}?`,
                            )
                          ) {
                            setRole(u.id, r);
                          }
                        }}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition ${
                          isCurrent
                            ? "cursor-not-allowed bg-muted text-muted-foreground opacity-60"
                            : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                        } ${busyId === u.id ? "opacity-50" : ""}`}
                      >
                        Make {r}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
