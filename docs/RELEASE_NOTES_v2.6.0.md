# Release Notes - v2.6.0 (2026-02-24)

## Added
- External stylesheet (`styles.css`) replacing inline style block.
- Smoke test checklist for manual validation.
- Chord/IR integration guide.
- IR installer script (`tools/install_ir_files.py`).
- Manifest rebuild script (`tools/rebuild_chord_manifest.py`).
- Chord recommendation preference profile support (`assets/chords/preferences.json`).
- Recommendation-first chord loop labeling in UI (`Recommended: ...`).
- Robust IR asset resolution with fallback candidates/discovery.

## Updated
- Baseline docs bundle under `docs/`.
- Chord library imported from provided packs.
- Reverb IRs installed from provided archive.
- Preference tuning for reference-style, C-minor leaning, 120-128 BPM profile.

## Operational Notes
- Repo size is approximately 1.1GB after audio import.
- No individual file exceeds GitHub's 100MB hard limit.
- For long-term maintenance, Git LFS is still recommended for WAV assets.
