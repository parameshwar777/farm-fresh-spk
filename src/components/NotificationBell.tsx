import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

/**
 * Notification bell with dropdown panel.
 * Used in admin header and merchant header.
 */
export function NotificationBell({
  tone = "primary",
}: {
  tone?: "primary" | "accent";
}) {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const fg = tone === "accent" ? "text-accent-foreground" : "text-primary-foreground";
  const bgPill = tone === "accent" ? "bg-accent-foreground/10" : "bg-primary-foreground/10";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full ${bgPill} ${fg}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/20"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-bold text-primary">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/10"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    🔔 No notifications yet
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        onClick={() => {
                          if (!n.is_read) markRead(n.id);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const icon = iconFor(n.type);
  const content = (
    <div className="flex gap-3 px-3 py-2.5">
      <div
        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            n.is_read ? "font-medium text-foreground/80" : "font-bold text-primary"
          }`}
        >
          {n.title}
        </p>
        {n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
      {!n.is_read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-destructive" />}
    </div>
  );
  return (
    <li>
      {n.link ? (
        <a href={n.link} onClick={onClick} className="block hover:bg-muted/50">
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} className="block w-full text-left hover:bg-muted/50">
          {content}
        </button>
      )}
    </li>
  );
}

function iconFor(type: string) {
  switch (type) {
    case "order_paid":
      return "💰";
    case "order_status":
      return "📦";
    case "low_stock":
      return "⚠️";
    case "new_user":
      return "👤";
    default:
      return "🔔";
  }
}

// Minimal default export so users can also `import NotificationBell` if they want
export default NotificationBell;

// Optional standalone Link helper (unused — keeps Link import warning-free in some builds)
export const _LinkRef = Link;
