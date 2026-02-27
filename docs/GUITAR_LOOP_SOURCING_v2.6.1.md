# Guitar Loop Sourcing Guide (v2.6.1)

## Current In-Repo Guitar Library
- Generated baseline library is now present under `assets/chords/library/`:
  - files named `gtr_dumble_ambient_*`
  - instrument-detected as `guitar` in `manifest.json`
- Generator script:
  - `tools/generate_guitar_meditation_loops.py`
- These are synthetic placeholders tuned for calming sessions; replace/augment with your real Strat/Dumble captures when ready.

## Target Loop Profile For Schumann Lab
- Tempo: **70-110 BPM** preferred (calmer cadence, less fatigue)
- Key focus: **C, Cm, Gm, Dm, Am** (works with existing app preferences)
- Duration: **12-40s** loopable phrases
- Timbre: **clean, ambient, swells, soft plucks, e-bow textures**
- Avoid by default: hard attack chugs, heavy distortion leads, busy arps

## Recommended Sources (Researched)
1. **Splice Sounds**  
   - Why: large ambient guitar catalog + explicit royalty-free usage in new recordings.  
   - Suggested packs:
     - `Soundscape Guitars` (Touch Loops): https://splice.com/sounds/packs/touch-loops/soundscape-guitars
     - `Ceremony - Ambient Guitar Loops` (ModeAudio): https://splice.com/sounds/packs/modeaudio/ceremony-ambient-guitar-loops
   - Licensing refs:
     - https://support.splice.com/hc/en-us/articles/360025013734-Splice-Sounds-Licensing-FAQ
     - https://splice.com/terms

2. **Cymatics (Free + Paid Packs)**  
   - Why: quick starter packs, many key/BPM-labeled guitar loops.
   - Suggested packs:
     - `Vibrations` (free): https://cymatics.fm/products/vibrations
     - `VAULT: Aether Guitar Melodies`: https://cymatics.fm/products/vault-aether-guitar-melodies
   - Licensing note: product pages state royalty-free rights; still keep purchase/download proof.

3. **BandLab Sounds (Free)**  
   - Why: no-cost source for testing and rapid iteration.
   - Licensing refs:
     - https://help.bandlab.com/hc/en-us/articles/115002960554-Can-I-sell-the-music-I-make-on-BandLab
     - https://help.bandlab.com/hc/en-us/articles/360018942593
   - Constraint: do not redistribute standalone loops.

4. **LANDR Samples / LANDR Guitar**  
   - Why: curated modern loops with clear royalty-free statements.
   - Licensing refs:
     - https://support.landr.com/hc/en-us/articles/360034071574-What-rights-do-I-have-for-the-loops-and-samples-I-download
     - https://support.landr.com/hc/en-us/articles/12835884696343-Is-the-content-on-LANDR-Guitar-royalty-free

5. **Looperman (Community Source, Use With Caution)**  
   - Why: huge free library and quick auditioning.
   - Licensing refs:
     - https://www.looperman.com/help/faq/loops
     - https://www.looperman.com/help/terms
   - Constraint: uploader-origin risk; manually verify/curate before shipping in app builds.

## Intake Checklist Before Adding To App
- Confirm license terms and keep URL + screenshot in a changelog.
- Normalize filename format: `gtr_<style>_<bpm>_<key>_<id>.wav`.
- Trim silence and add 5-20ms fades for seamless looping.
- Normalize peak to about **-1 dBFS**.
- Keep at least one **dry** version so IR choice is clearly audible in-app.
