# Schumann Lab Architecture (v2.6.6)

## Runtime Topology
- Static frontend:
  - `index.html` for structure
  - `styles.css` for presentation
  - `app.js` for UI orchestration, audio graph, persistence
- Asset directories:
  - `assets/audio/soundscapes/`
  - `assets/chords/`
  - `assets/ir/`
- Tooling scripts:
  - `tools/install_audio_assets.py`
  - `tools/install_ir_files.py`
  - `tools/rebuild_chord_manifest.py`

## Core Modules in app.js
1. UI State + Controls
2. Audio Engine (Web Audio API graph lifecycle)
3. Stimulation Modes
4. Soundscape Resolution and Fallback
5. Chord Loop Manifest/Cache + Recommendation Ranking
6. IR Convolution Stage (parallel dry/wet bus)
7. IR Preprocessing (raw decode cache, normalization, tail shaping, cache keying)
8. Developer Audio Tuning + Preset Mapper (`Calm`, `Balanced`, `Deep` by IR space)
9. Phase Delay + A/B Finder + Autosweep
10. Journal/History Persistence

## Data Contracts
- Chord manifest entry:
  - `file`: path relative to `assets/chords/`
  - `name`: display label
- Preferences file:
  - `favoriteKeywords[]`
  - `meditationKeywords[]`
  - `avoidKeywords[]`
  - `bpmRange[2]`

## Failure Strategy
- Missing chord/IR assets return null and app continues.
- Missing preferences file falls back to default ranking behavior.
- Missing browser capabilities degrade (where possible) instead of hard-fail.
- Developer tuning panel hidden state defaults to off; app behavior remains normal when unused.
- Processed IR cache is invalidated when tuning values change, then rebuilt on next graph start.
