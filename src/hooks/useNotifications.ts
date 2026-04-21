import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notification = {
  id: string;
  recipient_role: "admin" | "merchant" | "customer";
  recipient_user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Subscribe to notifications addressed to the current user's role
 * (admin/merchant) or to them personally (customer).
 *
 * Uses Supabase realtime so new notifications appear without a refresh.
 */
export function useNotifications() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const role = profile?.role ?? null;

  const refresh = useCallback(async () => {
    if (!user || !role) {
      setItems([]);
      setLoading(false);
      return;
    }
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (role === "admin") {
      query = query.eq("recipient_role", "admin");
    } else if (role === "merchant") {
      query = query.eq("recipient_role", "merchant");
    } else {
      query = query.eq("recipient_user_id", user.id);
    }

    const { data, error } = await query;
    if (!error) setItems((data as Notification[]) ?? []);
    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !role) return;
    const ch = supabase
      .channel(`notif-${role}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          // Only accept ones meant for us
          const mine =
            (role === "admin" && n.recipient_role === "admin") ||
            (role === "merchant" && n.recipient_role === "merchant") ||
            n.recipient_user_id === user.id;
          if (mine) {
            setItems((prev) => [n, ...prev].slice(0, 100));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, role]);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((i) => !i.is_read).map((i) => i.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  };

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}
