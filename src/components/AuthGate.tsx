import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { SpkLogo } from "@/components/SpkLogo";
import { motion } from "framer-motion";

// Routes that do NOT require auth
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic(location.pathname)) {
      navigate({ to: "/login", replace: true });
    }
    if (user && location.pathname === "/login") {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Loading state — small splash to avoid flicker
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <SpkLogo size={88} className="logo-glow" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // While redirecting, render nothing on protected paths
  if (!user && !isPublic(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
