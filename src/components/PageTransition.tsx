import { motion } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Lightweight page transition.
 *
 * Previously used <AnimatePresence mode="wait"> which forced the OUTGOING
 * page to finish its exit animation BEFORE the new page mounted. That made
 * tab switches feel laggy (~200–400ms perceived delay even when the next
 * route was already in cache).
 *
 * New behaviour: mount the new page IMMEDIATELY and just fade it in. No
 * waiting, no exit animation. Feels instant.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ minHeight: "100dvh" }}
    >
      {children}
    </motion.div>
  );
}
