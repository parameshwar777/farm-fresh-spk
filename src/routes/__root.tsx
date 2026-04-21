import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthGate } from "@/components/AuthGate";
import { PageTransition } from "@/components/PageTransition";
import { AuthProvider } from "@/hooks/useAuth";

import appCss from "../styles.css?url";

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
      { property: "og:title", content: "SPK Natural Farming — Fresh From Farm" },
      { property: "og:description", content: "SPK Natural Farming is a full-stack organic vegetable delivery app." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "SPK Natural Farming — Fresh From Farm" },
      { name: "description", content: "SPK Natural Farming is a full-stack organic vegetable delivery app." },
      { name: "twitter:description", content: "SPK Natural Farming is a full-stack organic vegetable delivery app." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4222dc3c-303c-400b-84c7-c97baa9aa856/id-preview-9c5092ee--648948ec-1c55-4e5a-a9d2-515d16ed1584.lovable.app-1776768610670.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4222dc3c-303c-400b-84c7-c97baa9aa856/id-preview-9c5092ee--648948ec-1c55-4e5a-a9d2-515d16ed1584.lovable.app-1776768610670.png" },
      { name: "twitter:card", content: "summary_large_image" },
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
  // Splash plays on every app open (fresh page load)
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="mobile-frame">
      <AuthProvider>
        <AuthGate>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </AuthGate>
      </AuthProvider>
      {/* Splash sits on top — covers any auth-redirect flicker underneath */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Toaster position="top-center" richColors closeButton theme="light" />
    </div>
  );
}
