# Schumann Lab iOS App Store Release Guide (Mac Mini)

Prepared for: moving from Windows/WSL development to macOS signing and App Store release.
Prepared on: 2026-03-02.

## 1. What Is Already Scaffolded In This Repo

- `capacitor.config.json` exists and is set to:
  - `appId`: `com.patrickbitner.schumannlab`
  - `appName`: `Schumann Lab`
  - `webDir`: `www`
- `package.json` includes Capacitor dependencies and iOS scripts:
  - `npm run cap:prepare`
  - `npm run cap:add:ios`
  - `npm run cap:sync:ios`
  - `npm run cap:open:ios`
  - `npm run cap:doctor`
- `tools/prepare_capacitor_webdir.js` builds `www/` by copying:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `assets/`

## 2. Mac Mini Prerequisites

1. Install latest Xcode from the Mac App Store.
2. Open Xcode once and accept license/install components.
3. Install Node.js LTS (recommended: 20+).
4. Ensure you can run:
   - `node -v`
   - `npm -v`
   - `xcodebuild -version`
5. Sign into Xcode with the Apple ID in your Apple Developer account.
6. Verify your Apple Developer Program membership is active.

## 3. First-Time Project Setup On Mac

From repo root:

```bash
npm install
npm run cap:prepare
npm run cap:add:ios
npm run cap:sync:ios
npm run cap:open:ios
```

Notes:
- `npm run cap:add:ios` is first-time only. After that, use `cap:sync:ios`.
- If `ios/` already exists later, skip `cap:add:ios`.

## 3.1 Lockfile Requirement (Important)

After `npm install`, make sure `package-lock.json` is present and tracked in git.
This ensures deterministic dependency resolution across your Mac, CI, and future machines.

Run:

```bash
git add package-lock.json
git commit -m "chore: add package-lock for deterministic npm installs"
git push origin main
```

If `npm install` later updates the lockfile, commit that change as well.

## 4. Daily Update Flow (After You Change Web Code)

```bash
npm run cap:sync:ios
npm run cap:open:ios
```

This refreshes the native iOS shell with latest web assets.

## 5. Xcode Signing And Build Settings

In Xcode (`ios/App/App.xcworkspace`):

1. Target: `App` -> `Signing & Capabilities`
2. Enable `Automatically manage signing`
3. Select your Team
4. Confirm Bundle ID: `com.patrickbitner.schumannlab`
5. Set version numbers:
   - Marketing Version (example: `2.6.7`)
   - Build Number (increment each upload, example: `26701`, `26702`, ...)
6. App icons:
   - Add final icons in `Assets.xcassets`
7. If you need background audio behavior:
   - Add capability `Background Modes`
   - Enable `Audio, AirPlay, and Picture in Picture`
   - Re-test battery behavior and lock-screen/foreground transitions

## 6. App Store Connect Setup

In App Store Connect:

1. Create new app record:
   - Platform: iOS
   - Name: Schumann Lab
   - Primary language
   - Bundle ID: `com.patrickbitner.schumannlab`
2. Fill app metadata:
   - Description, keywords, support URL, marketing URL (if any)
   - Screenshots for required device sizes
3. Complete App Privacy questionnaire.
4. Set age rating and content rights info.
5. Add TestFlight testers (internal first, external after).

## 7. Upload Build From Xcode

1. In Xcode set destination to `Any iOS Device (arm64)`.
2. Menu: `Product` -> `Archive`.
3. In Organizer select archive -> `Distribute App`.
4. Choose `App Store Connect`.
5. Upload and wait for processing in App Store Connect.
6. Attach the processed build to your app version, then submit for review.

## 8. Recommended TestFlight Gate Before Submission

- Audio starts and stops correctly in Explore and Meditate modes.
- Reverb space switching works (`None`, `Forest`, `Temple`).
- Breathing orb behavior and flash effects render smoothly on real iPhone.
- No crashes when switching tabs repeatedly.
- Session timer, journaling, and exports behave as expected.

## 9. Important Time-Sensitive Policy Check

Apple requirements can change each cycle. Check current upload requirements before archiving.
As of this guide date (2026-03-02), Apple posted upcoming App Store submission requirements with an April 2026 enforcement window.
Before your first submission, re-check:

- https://developer.apple.com/news/?id=utw4yhtp
- https://developer.apple.com/app-store/submitting/
- https://developer.apple.com/app-store/review/guidelines/

## 10. Quick Troubleshooting

- Signing error:
  - Re-select Team, confirm Bundle ID not used by another app in your account.
- Build uploaded but not visible:
  - Wait for App Store Connect processing (can take minutes to hours).
- Web changes not showing in iOS app:
  - Run `npm run cap:sync:ios` again, then clean build folder in Xcode.
- App Review audio/background concerns:
  - Keep background audio behavior intentional and documented in review notes.

## 11. Helpful References

- Capacitor iOS deploy docs:
  - https://capacitorjs.com/docs/ios/deploying-to-app-store
- Capacitor general docs:
  - https://capacitorjs.com/docs/getting-started
- App Store Connect upload flow:
  - https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple Developer Program membership:
  - https://developer.apple.com/support/compare-memberships/
