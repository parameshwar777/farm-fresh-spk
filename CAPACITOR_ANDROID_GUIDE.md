# SPK Natural Farming — Android APK Guide (Capacitor)

This guide walks you from this Lovable web app to a working `.apk` on your phone.

---

## 0. One-time prerequisites (install on your computer)

1. **Node.js 20+** & **bun** (you already have these in Lovable, install locally too): https://nodejs.org
2. **Android Studio** (Hedgehog or newer): https://developer.android.com/studio
   - During install, let it download the **Android SDK**, **Platform Tools** and an **Emulator** image.
3. **Java JDK 17** (Android Studio bundles it — no extra install needed in most cases).

After installing Android Studio, open it once → *More Actions* → *SDK Manager* → make sure **Android SDK Platform 34** and **Android SDK Build-Tools 34** are checked.

---

## 1. Get the code on your computer

In Lovable click **GitHub → Connect / Open** to push this project to a GitHub repo, then on your laptop:

```bash
git clone <your-repo-url> spk-app
cd spk-app
bun install
```

---

## 2. Install Capacitor

```bash
bun add @capacitor/core @capacitor/cli @capacitor/android \
        @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
```

> `capacitor.config.ts` is already in this repo — no need to run `cap init`.

---

## 3. Add the Android platform

```bash
bunx cap add android
```

This creates an `android/` folder (a real Android Studio project).

---

## 4. Build the web app and sync into Android

Every time you change code, repeat these two steps:

```bash
bun run build         # produces dist/
bunx cap sync android # copies dist + plugins into android/
```

> The included `capacitor.config.ts` currently points at the **live Lovable URL**
> (`https://farm-fresh-spk.lovable.app`) so the APK always shows the latest version
> without rebuilding. For a fully **offline** APK, open `capacitor.config.ts`
> and **comment out the entire `server: { ... }` block**, then re-run the two
> commands above.

---

## 5. Open in Android Studio & run on a phone

```bash
bunx cap open android
```

Android Studio will open the project. First time it will index for a few minutes.

### Run on your physical phone (recommended)

1. On your phone: **Settings → About phone → tap "Build number" 7 times** → enables Developer options.
2. **Settings → Developer options → enable USB debugging**.
3. Plug phone into laptop with USB cable, tap **Allow** on the prompt.
4. In Android Studio top bar, your phone name should appear in the device dropdown.
5. Click the green ▶ **Run** button.

The app installs and launches on your phone. 🎉

---

## 6. Build a release APK (for Play Store or sharing)

### 6a. Generate a signing key (one time, keep this file safe forever)

```bash
keytool -genkey -v -keystore spk-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias spk
```

It will ask for a password — **save it in a password manager**. If you lose this `.jks` file or password you can NEVER push updates to the same Play Store listing.

Move `spk-release.jks` into `android/app/`.

### 6b. Tell Gradle about your key

Create file `android/key.properties`:

```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=spk
storeFile=spk-release.jks
```

Edit `android/app/build.gradle` and add **above** `android { ... }`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android { ... }` add:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 6c. Build the APK

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Or from the terminal:

```bash
cd android
./gradlew assembleRelease
```

Your APK will be at:

```
android/app/build/outputs/apk/release/app-release.apk
```

For Play Store upload, build an **AAB** instead:

```bash
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

---

## 7. Pushing a new version

1. Bump the version in **Admin → Settings → App Version Control** (so users on old versions see the update prompt).
2. In `android/app/build.gradle` increment `versionCode` (an integer, must always go up) and `versionName` (the human string, e.g. `"1.0.1"`).
3. `bun run build && bunx cap sync android`
4. Rebuild APK / AAB as in step 6c.
5. Upload to Play Console.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White screen on launch | Check `capacitor.config.ts` → `server.url` is reachable, or you ran `bun run build && bunx cap sync` after disabling `server`. |
| Keyboard freezes the app | Already fixed in this project (`Keyboard.resize = "native"` + viewport meta). Make sure `@capacitor/keyboard` is installed and you ran `cap sync`. |
| "SDK location not found" | Open Android Studio → SDK Manager, copy the SDK path, set env var `ANDROID_HOME=/path/to/sdk`. |
| Camera / gallery upload doesn't work | The app uses standard HTML file input, which Android WebView handles natively — no extra plugin required. Allow storage permission when prompted. |
| App not updating after code change | You forgot `bun run build && bunx cap sync android` before rebuilding. |

---

## Quick command cheat-sheet

```bash
# every code change:
bun run build && bunx cap sync android

# open in android studio:
bunx cap open android

# build debug apk from terminal:
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk

# build signed release apk:
cd android && ./gradlew assembleRelease
```
