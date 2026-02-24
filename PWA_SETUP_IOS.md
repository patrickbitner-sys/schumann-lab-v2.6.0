# Schumann Lab on iOS (Worldwide Web + Safari)

This guide covers two practical ways to run **Schumann Lab v2.6.x** on iPhone/iPad:
- Option A: host files directly on-device with **Worldwide Web**
- Option B: host from your computer and open in **Safari** on iOS

## Requirements
- iOS/iPadOS device with Safari
- Schumann Lab project folder (this repo contents)
- For Option A: Worldwide Web app installed on iOS
- For Option B: your iOS device and computer on the same network

## Option A: Worldwide Web (on-device hosting)
1. Copy the Schumann Lab folder to iPhone/iPad Files.
2. Open **Worldwide Web** and navigate to that folder.
3. Start the local server (Play/Start button).
4. Open Safari and go to the URL shown by Worldwide Web (for example `http://localhost:8080`).
5. Start audio with a user action (`Start Explore` or `Start Meditate`).

Optional:
- Use Safari Share -> **Add to Home Screen** for quicker launch.

## Option B: Host on Computer, open in iOS Safari
1. From repo root on your computer, start a local static server:

```bash
python3 -m http.server 6969
```

2. Find your computer LAN IP (for example `192.168.1.25`).
3. On iPhone/iPad Safari, open:

```text
http://<your-computer-ip>:6969
```

4. Tap `Start Explore` or `Start Meditate` to initialize audio.

## iOS Audio Behavior Notes
- iOS requires a user gesture before audio can start.
- Background behavior is platform-controlled and can vary by iOS/Safari version.
- In many iOS Safari cases, Web Audio may be interrupted when Safari/web app goes to background.
- This app now attempts automatic `AudioContext` resume when returning to foreground.

## Background Audio Test (Recommended)
Use headphones and medium volume.

1. Open the app in Safari and tap `Start Explore`.
2. Confirm continuous audio for at least 20 seconds.
3. Press Home / swipe to app switcher to background Safari for 15-30 seconds.
4. Return to Safari.
5. Observe outcome:
   - PASS-A: audio continued in background and is still playing.
   - PASS-B: audio paused in background but resumed automatically on return.
   - WARN: audio stopped and required tapping `Start Explore` again.
6. Repeat from Home Screen shortcut (if installed) because behavior may differ from normal Safari tab.

## Troubleshooting
- If silent on launch: tap Start again (first-gesture policy).
- If audio fails after app switching: tap Stop then Start.
- If assets fail to load: ensure URL uses `http://` and not `file://`.
- If reverb/chords are missing: verify files exist:
  - `assets/ir/forest.wav`
  - `assets/ir/temple.wav`
  - `assets/chords/manifest.json`

## Quick Validation URLs
- App root: `http://<host>:6969/`
- Chord manifest: `http://<host>:6969/assets/chords/manifest.json`
- Forest IR: `http://<host>:6969/assets/ir/forest.wav`
- Temple IR: `http://<host>:6969/assets/ir/temple.wav`

## References
- Apple iPhone User Guide (Add to Home Screen): https://support.apple.com/en-ie/guide/iphone/iphea86e5236/ios
- MDN `BaseAudioContext.state` (`interrupted` behavior notes): https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state
- WebKit bug tracker (recent iOS background audio interruption reports): https://bugs.webkit.org/show_bug.cgi?id=281955
