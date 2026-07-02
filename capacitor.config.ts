import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for SPK Natural Farming.
 *
 * The Android app uses bundled web assets from `dist/client` for fast startup.
 * Run `npm run build && npx cap sync android` before rebuilding the APK.
 */
const config: CapacitorConfig = {
  appId: "com.spk.naturalfarming",
  appName: "SPK Natural Farming",
  webDir: "dist/client",
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      backgroundColor: "#FAFAF5",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
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
      // Don't let the WebView draw under the status bar — keeps our header
      // from sliding behind the battery / clock icons on Android.
      overlaysWebView: false,
    },
  },
};

export default config;
