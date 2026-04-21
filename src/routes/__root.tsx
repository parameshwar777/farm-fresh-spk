import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";

import appCss from "../styles.css?url";

const SPLASH_KEY = "spk_splash_seen_v1";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl">🌾</div>
        <h1 className="mt-4 font-display text-4xl font-bold text-primary">404</h1>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0",
      },
      { title: "SPK Natural Farming — Fresh From Farm" },
      {
        name: "description",
        content:
          "SPK Natural Farming — fresh organic vegetables, fruits and grains delivered from farm to your home. Grown the SPK way.",
      },
      { name: "theme-color", content: "#1B4332" },
      { property: "og:title", content: "SPK Natural Farming" },
      { property: "og:description", content: "Fresh from farm — organic vegetables delivered." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.ico" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SPLASH_KEY);
      if (!seen) setShowSplash(true);
    } catch {
      // sessionStorage unavailable — skip splash
    }
    setReady(true);
  }, []);

  const finishSplash = () => {
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // ignore
    }
    setShowSplash(false);
  };

  return (
    <div className="mobile-frame">
      {ready && showSplash && <SplashScreen onFinish={finishSplash} />}
      <Outlet />
      <Toaster position="top-center" richColors closeButton theme="light" />
    </div>
  );
}
