# Chord Library Curation (v2.6.1)

## What Changed
- Removed **258 hash-confirmed duplicate WAV files** from `assets/chords/library`.
- Kept the `mammoth_synth_chords__*` canonical copies.
- Applied recommended pruning set:
  - removed `MSC_DuoArpo-*`
  - removed `*[170]-*`
  - removed `*11` ending chords
- Generated **12 meditation guitar loops** (`gtr_dumble_ambient_*`) for immediate in-app use.
- Rebuilt `assets/chords/manifest.json` after cleanup.
- Added `assets/chords/manifest.mobile.json` for mobile/PWA stability.

## Current Library Size
- Files in `assets/chords/library`: **245**
- Total disk size: **~428 MB**
- Manifest counts (`manifest.json`):
  - piano: 27
  - harp: 13
  - synth: 185
  - guitar: 20
- Mobile manifest counts (`manifest.mobile.json`):
  - piano: 27
  - harp: 13
  - synth: 88
  - guitar: 20

## Mobile Reliability Strategy
- iPhone/Android now prefer `manifest.mobile.json` automatically.
- Desktop continues using full `manifest.json`.
- This keeps recommended/favorite loops while reducing the available mobile loop set from **245 -> 148**.

## Suggested Next Removals (If You Want A Smaller Full Library)
- First candidates:
  - remaining fast/transient-heavy leads or pluck-style loops above your comfort threshold
  - any loops that create listener fatigue in A/B listening at 15-20 minute session lengths
- Keep as core (highest meditation weighting in current preferences):
  - `CK2_125_Cm_*`
  - `CK2_125_Gm_*`
  - `MSC_*[sus]-C*` and `MSC_*Cmaj7*` families
  - `user_reference__piano_gentle_1_Reference-style.wav`
  - `gtr_real_mr_strat_ambient_*` (real Strat-based loops)
  - `gtr_real_mr_acoustic_*` (real acoustic support loops)

## Practical Trim Targets
- Light trim target: **120-150 loops total**
- Aggressive trim target: **80-100 loops total**
- For iOS testing, start with mobile manifest only; prune physical files after your listening pass.
