import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

type BackFallback = "/" | "/shop" | "/cart" | "/profile" | "/orders" | "/admin" | "/merchant";

export function useAppBack(defaultFallback: BackFallback = "/") {
  const location = useLocation();
  const navigate = useNavigate();

  const goBack = useCallback(
    (fallback: BackFallback = defaultFallback) => {
      if (typeof window === "undefined") return;

      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      if (location.pathname !== fallback) {
        navigate({ to: fallback });
        return;
      }

      if (Capacitor.isNativePlatform()) {
        void CapacitorApp.exitApp();
      }
    },
    [defaultFallback, location.pathname, navigate],
  );

  return { goBack };
}

export function AppBackHandler() {
  const { goBack } = useAppBack("/");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    let removeListener: (() => Promise<void>) | undefined;

    void CapacitorApp.addListener("backButton", () => {
      if (!mounted) return;
      goBack();
    }).then((listener) => {
      removeListener = () => listener.remove();
    });

    return () => {
      mounted = false;
      void removeListener?.();
    };
  }, [goBack]);

  return null;
}