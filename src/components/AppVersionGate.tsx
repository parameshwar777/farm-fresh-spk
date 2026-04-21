import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * App version: hard-coded build number for THIS build of the web/native app.
 * Bump this whenever you cut a new Play Store / App Store build.
 *
 * Admin sets `min_app_version` in Admin → Settings. If APP_VERSION < min,
 * users are blocked with an "Update required" screen.
 */
export const APP_VERSION = "1.0.0";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

type State = {
  required: boolean;
  minVersion: string;
  message: string;
  android: string;
  ios: string;
};

export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [
          "min_app_version",
          "app_update_message",
          "app_store_url_android",
          "app_store_url_ios",
        ]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { key: string; value: string }) => {
        map[r.key] = r.value;
      });
      const minVersion = map.min_app_version || "0.0.0";
      const required = compareVersions(APP_VERSION, minVersion) < 0;
      if (!cancelled) {
        setState({
          required,
          minVersion,
          message:
            map.app_update_message ||
            "A new version is available. Please update to continue.",
          android: map.app_store_url_android || "",
          ios: map.app_store_url_ios || "",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state?.required) {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const storeUrl = isIOS ? state.ios : state.android;

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <div className="text-6xl">🌱</div>
          <h1 className="mt-4 font-display text-2xl font-bold text-primary">
            Update Required
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            You're on v{APP_VERSION} · Required v{state.minVersion}
          </p>
          {storeUrl ? (
            <a
              href={storeUrl}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Update Now
            </a>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Reload App
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
