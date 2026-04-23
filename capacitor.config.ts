import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for SPK Natural Farming.
 *
 * IMPORTANT — replace `server.url` with your published Lovable URL when you
 * want the native app to load the live web build. For a fully offline APK
 * (recommended for Play Store), comment out `server` and run `bun run build`
 * before `npx cap sync` so the static `dist/` is bundled.
 */
const config: CapacitorConfig = {
  appId: "com.spk.naturalfarming",
  appName: "SPK Natural Farming",
  webDir: "dist",
  // Use this while testing — points the APK at the live web app.
  // Remove or comment out for a production offline build.
  server: {
    url: "https://farm-fresh-spk.lovable.app",
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FAFAF5",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      // `resize: "native"` prevents the white-frame freeze you were seeing
      // when the soft keyboard opens on Android.
      resize: "native",
      style: "DEFAULT",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1B4332",
    },
  },
};

export default config;
