# Schumann Lab Requirements (v2.6.6 Baseline)

## Product Intent
Schumann Lab provides a browser-first meditation audio environment centered on Schumann-band stimulation, breath synchronization, and reflective journaling.

## Functional Requirements
1. App loads as static PWA-compatible site with no backend dependency.
2. Explore mode supports Schumann band selection and immediate audio start/stop.
3. Four stimulation modes are supported: Isochronic (AM), Binaural, Spatial Echo, Ambient Echo.
4. Soundscapes support Ocean/Rain/Birds/Waves with independent gain controls.
5. Chord layer supports synthesized playback and loop-based playback from `assets/chords/manifest.json`.
6. Chord loop recommendations prioritize meditation suitability and user preference profile.
7. Reverb supports `Forest` and `Temple` impulse responses from `assets/ir/*.wav`.
8. Reverb includes a parallel dry/wet path so direct signal is always preserved with convolved signal.
9. Hidden developer controls are available behind `Developer Audio Tuning` checkbox.
10. Developer controls expose:
   - IR normalize trim (dB)
   - IR tail duration (seconds)
   - IR tail low-pass frequency (Hz)
   - IR wet trim (%)
   - IR send trim (%)
11. Developer controls include named presets `Calm`, `Balanced`, and `Deep` mapped per selected IR space (`Temple`/`Forest`).
12. Phase tools include slider, autosweep, strongest-phase marking, and A/B comparison workflow that converges to ~18° granularity.
13. Meditate mode supports session timer and best-phase reuse.
14. Journal supports save, render, export, and clear actions.
15. Local persistence uses localStorage for journal entries and phase history.

## Non-Functional Requirements
1. Must run from local static server (`http://localhost`) without build step.
2. Core UI must remain usable on desktop and mobile.
3. Missing optional assets must degrade gracefully without hard crash.
4. Audio graph restarts must not leave orphan nodes or timers.
5. No sensitive user data leaves device by default.
6. IR normalization/tail shaping must prevent clipping/distortion for both bundled IRs.
7. Developer tuning changes must apply without page reload (graph restart permitted when audio is active).

## Asset Requirements
1. IR files:
   - `assets/ir/forest.wav`
   - `assets/ir/temple.wav`
2. Chord loops under `assets/chords/library/` with generated `assets/chords/manifest.json` and optional `assets/chords/manifest.mobile.json`.
3. Optional recommendation profile at `assets/chords/preferences.json`.
