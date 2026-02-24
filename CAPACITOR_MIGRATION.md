# Migrating to Native iOS and Android with Capacitor

This guide walks through converting the **Schumann Resonance Lab** PWA into native iOS and Android applications using [Capacitor](https://capacitorjs.com/).  Capacitor wraps your web app in a native shell, giving you access to platform features while reusing your existing code.

## 1. Install Capacitor

Install the Capacitor CLI globally (requires Node.js and npm):

```bash
npm install --global @capacitor/cli
```

Create a fresh `package.json` if you don’t already have one.  From the root of your project:

```bash
npm init -y
```

Add Capacitor to your project and initialise it.  You’ll be prompted for an **app name** and **app ID** (reverse‑DNS format, e.g. `com.example.schumannlab`):

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

Capacitor will create a `capacitor.config.json` file.  By default it looks for your web assets in the `www/` directory.  Our PWA files live in the project root, so we need to set `"webDir": "."` in the config:

```json
{
  "appId": "com.example.schumannlab",
  "appName": "Schumann Lab",
  "webDir": ".",
  "bundledWebRuntime": false
}
```

## 2. Add Platforms

Add the iOS and/or Android platforms.  This will create `ios/` and `android/` directories with native projects:

```bash
npx cap add ios
npx cap add android
```

On macOS you can open the iOS project in Xcode:

```bash
npx cap open ios
```

For Android, open the project in Android Studio:

```bash
npx cap open android
```

## 3. Copy Web Assets

Whenever you change your web code you must copy the latest assets into the native projects and rebuild them.  Run:

```bash
npx cap copy
```

You can also call `npx cap sync` to both install any native plugins and copy assets.

## 4. Platform‑Specific Notes

### iOS

- **Permissions**: iOS requires usage descriptions in `Info.plist` for features like audio, microphone and haptics.  Open `ios/App/App/Info.plist` in Xcode and add:
  ```xml
  <key>NSMicrophoneUsageDescription</key>
  <string>This app plays and records audio for meditation.</string>
  <key>UIBackgroundModes</key>
  <array>
    <string>audio</string>
  </array>
  ```
  The Lab does not record audio, but iOS may require the microphone permission for Web Audio output on some devices.
- **Icons and splash**: Replace the default icons and splash screens in `ios/App/App/Assets.xcassets` with your own artwork.
- **Haptics**: Capacitor automatically bridges the Web Vibration API to native haptics where possible.  No extra plugins are required.

### Android

- **Minimum SDK**: Ensure that the `minSdkVersion` in `android/app/build.gradle` is at least 21 (Android 5.0) to support Web Audio.
- **File size**: High‑quality soundscape files increase the APK size.  Consider enabling Android App Bundle (AAB) builds for distribution.
- **Haptics**: The standard `navigator.vibrate()` API maps to the Android vibration service.  Permissions are handled automatically.

## 5. Adding High‑Quality Soundscape Loops

Place your `.wav` files (48 kHz/24‑bit) in the project root alongside `ocean-wave-1.wav`.  Name them exactly:

- `ocean-wave-1.wav` – A seamless ocean loop with natural swells.
- `rain.wav` – A continuous rain ambience.
- `birds.wav` – A birdsong loop (optional).
- `waves.wav` – A slow wave set (optional).

These files are loaded asynchronously by the app.  If they aren’t present the Lab falls back to the synthetic noise patterns.  You can update the loops at any time by replacing the corresponding `.wav` files in your project and running `npx cap copy` again; Capacitor will bundle the new audio into the native projects.

## 6. Testing and Deployment

Use the platform IDEs (Xcode for iOS, Android Studio for Android) to run and test the app on devices or simulators.  You can debug the Web View using Safari’s Web Inspector (iOS) or Chrome DevTools (Android via `chrome://inspect`).

When you’re ready to publish:

- **iOS**: Archive the app in Xcode and upload it to App Store Connect.  Follow Apple’s guidelines for TestFlight and App Store submission.
- **Android**: Generate a signed release AAB in Android Studio and upload it to the Google Play Console.

## 7. Useful Capacitor Commands

- `npx cap copy` – Copy updated web assets into native projects.
- `npx cap sync` – Install native plugins and copy assets.
- `npx cap open ios|android` – Open the native project in Xcode or Android Studio.
- `npx cap doctor` – Diagnose common configuration issues.

For more details see the official [Capacitor documentation](https://capacitorjs.com/docs/v5/getting-started).
