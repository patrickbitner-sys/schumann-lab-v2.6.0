# Running Schumann Lab on iPhone

This guide explains how to host and install the **Schumann Resonance Lab** as a local PWA on an iOS device (such as an iPhone 16 Pro) using the **Worldwide Web** app.  The Worldwide Web app acts as a lightweight local server, allowing you to serve the app’s files directly from your device and install it to the home screen.

## Prerequisites

1. **Worldwide Web app** – Download and install the “Worldwide Web” app from the iOS App Store.  This app lets you share local files via HTTP without requiring a computer.
2. **Schumann Lab files** – Copy the unzipped Schumann Lab project folder (e.g. `schumann_lab_v2.2.1`) onto your iPhone.  You can do this via AirDrop, Files app or iTunes File Sharing.

## Steps

1. **Launch Worldwide Web** and navigate to the directory containing the Schumann Lab files.  Tap the folder (e.g. `schumann_lab_v2.2.1`) to open it.
2. **Start the server**: tap the **Play** button to start serving files from this folder.  The app will display a local URL such as `http://localhost:8080/`.
3. **Open Safari** and enter the local URL provided by Worldwide Web.  You should see the Schumann Lab homepage.
4. **Install as a PWA**: tap the Share icon, then choose **Add to Home Screen**.  Safari will prompt you to confirm.  The app will appear on your home screen as “Schumann Lab”.  Launching it from there runs it full‑screen and offline.
5. **Grant permissions**: on first launch, allow **microphone/audio access** if prompted, and accept notifications if you intend to use future reminder features.  For haptic feedback to work, ensure the device is not in silent mode.

## Tips

- If you update the app files (e.g. replace `app.js` or `manifest.webmanifest`), you may need to clear the browser cache.  Incrementing the `version` in `manifest.webmanifest` and the cache name in `service-worker.js` ensures the device fetches the latest code.
- On iOS, audio can only start after a user gesture.  Tap **Start explore** or **Play** to initialise the audio context.  Voice prompts and echoes use the Speech Synthesis and Web Audio APIs and may require interaction before they work.

By following these steps you can enjoy the Schumann Resonance Lab on your iPhone without relying on an external web server.  This method also works for iPad or other iOS devices that support PWA installation.