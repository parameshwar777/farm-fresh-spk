import type { ReactNode } from "react";

/**
 * No-op wrapper. Fade transitions were adding perceived lag on Android
 * (~120ms per nav + layout thrash). Instant render is faster and feels
 * more native.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

