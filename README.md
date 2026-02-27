# Schumann Lab v2.6.0

Browser-first Schumann resonance meditation lab with:
- Schumann-band stimulation modes (AM, Binaural, Spatial Echo, Ambient Echo)
- Soundscape mixing (ocean, rain, birds, waves)
- Chord layers with recommendation ranking and user preferences
- Mobile-aware chord manifests (`manifest.mobile.json` fallback on iOS/Android)
- Built-in real meditation guitar loop library (`gtr_real_mr_*`)
- Forest/Temple convolution reverb
- Guided phase A/B finder (to 18° resolution), autosweep, meditation timer, and journal/history persistence

## Baseline
- Current baseline: `v2.6.0`
- Baseline marker: `BASELINE_VERSION.md`

## Quick Start
1. Serve locally from repo root:
```bash
python3 -m http.server 6969
```
2. Open:
```text
http://localhost:6969
```

Note: Open via HTTP, not `file://`.

## Key Files
- `index.html` UI shell
- `styles.css` styles
- `app.js` audio engine + UI logic
- `assets/audio/soundscapes/` ambience assets
- `assets/chords/` chord manifest/library/preferences
- `assets/ir/` impulse responses

## Chords and IR
- Integration guide: `CHORD_IR_INTEGRATION.md`
- Install IR helper: `tools/install_ir_files.py`
- Rebuild chord manifest: `tools/rebuild_chord_manifest.py`
- Generate synthetic meditation guitar loops: `tools/generate_guitar_meditation_loops.py`
- Chord curation notes: `docs/CHORD_LIBRARY_CURATION_v2.6.1.md`
- Guitar loop sourcing notes: `docs/GUITAR_LOOP_SOURCING_v2.6.1.md`

## iOS Setup
- iOS setup guide (Worldwide Web + Safari): `PWA_SETUP_IOS.md`
- iOS on-device validation checklist: `ON_DEVICE_TEST_CHECKLIST.md`

## Testing
- Manual smoke checklist: `SMOKE_TEST_CHECKLIST.md`

## Design Docs
- `docs/REQUIREMENTS_v2.6.0.md`
- `docs/ARCHITECTURE_v2.6.0.md`
- `docs/DIAGRAM_v2.6.0.md`
- `docs/RELEASE_NOTES_v2.6.0.md`

## Release Workflow
- Lightweight release guide: `RELEASE_WORKFLOW.md`
- One-command patch release (example):
```bash
python3 tools/release_v26.py 2.6.1 --push
```

## Repository Notes
This repo includes large audio assets. For long-term scaling, use Git LFS for WAV/MP3 libraries.
