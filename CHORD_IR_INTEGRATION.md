# Chord + IR Integration Guide

## 1) Install Your Two IR Files

Run from repo root:

```bash
python3 tools/install_ir_files.py \
  --forest "/absolute/path/to/your/forest_ir.wav" \
  --temple "/absolute/path/to/your/temple_ir.wav"
```

This installs:
- `assets/ir/forest.wav`
- `assets/ir/temple.wav`

## 2) Add Your Chord Library

Place your chord loops in:
- `assets/chords/library/`

Then regenerate the manifest:

```bash
python3 tools/rebuild_chord_manifest.py
```

## 3) Make Your Favorite Chord the Stylistic Anchor

Copy the template:

```bash
cp assets/chords/preferences.example.json assets/chords/preferences.json
```

Edit `assets/chords/preferences.json` and set `favoriteKeywords` to include your tested favorite chord labels (for example, `"Cm"`, `"Cmin9"`, `"Csus2"`).

The app now ranks loops and puts a `Recommended:` option first in the chord loop dropdown using:
- your `favoriteKeywords` (strong boost)
- meditative keywords (`sus`, `add9`, `maj7`, `pad`, `drone`)
- BPM target range (default 110-140)
- avoid keywords (e.g. `drum`, `perc`, `stacc`, `pluck`, `arp`)

## 4) Chord Types Usually Best for This App's Intent

For calm meditation focus, prioritize loops that are:
- low motion harmonically (drone/pedal, suspended harmony)
- soft attack and longer tails
- low-mid density (not busy, not percussive)

Strong candidates:
- minor 7 (`m7`)
- minor add9 (`m(add9)`)
- suspended (`sus2`, `sus4`)
- major 7 (`maj7`) when very soft/pad-like
- quartal/open voicings with no strong dominant pull

Usually less suitable:
- dominant 7 with strong resolution pull
- bright staccato plucks
- arp-heavy rhythmic loops

## 5) Verify in App

1. Start server: `python3 -m http.server 6969`
2. Open `http://localhost:6969`
3. Set `Chord Layer` to an instrument and confirm `Chord Loop` appears.
4. Verify top option is `Recommended: ...`.
5. Set `Reverb Space` to Forest/Temple and confirm no fetch errors.
