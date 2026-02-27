# Features of Schumann Resonance Lab

The **Schumann Resonance Lab** is a self‑contained PWA designed to help users explore brainwave entrainment inspired by the Earth’s Schumann resonances.  It combines audio generation, interactive phase discovery, music accompaniment and journalling tools in a single web application.  Below is a summary of the major features in version 2.5.0.

## Explore Mode
*Note: This document describes the features available in version 2.5.0.*

### Two‑Tier Phase Discovery

When you click **Start explore**, the Lab leads you through a two‑step process to find your optimal interaural phase delay:

1. **Coarse Scan** – Seven equally spaced phase values from 0°–360° are presented sequentially.  Each phase dwells for **3 seconds**, with a **1 second** crossfade into the next.  Tap **Mark strongest now** whenever the sensation feels most pronounced.  You will feel a vibration and hear a chime confirming your input.
2. **Fine Scan** – The two phases with the most marks are subdivided into seven finer segments.  Each segment dwells for **5 seconds** with a **3 second** fade.  Continue marking the strongest sensations.

At the end of the fine scan the Lab computes your personal best phase for the current Schumann band.  This value is saved and reused in Meditation mode.  A **Fine‑tune sweep** button appears, allowing you to perform a slow continuous sweep ±30° around the discovered optimum to adjust it further.

During both tiers the Lab displays a **progress indicator** beneath the phase controls.  This compact panel shows the current tier (1 or 2), the step number out of seven, and a live countdown timer for the dwell period.  The countdown helps you anticipate when the next phase will arrive so you can prepare to tap **Mark strongest now**.  Once a guided scan completes, a **scan summary** appears listing the two phases with the most marks and highlighting the optimal phase that has been saved for the current band.  The summary disappears automatically when you start a new exploration.

### Autosweep

If you prefer manual exploration, you can use the **Start autosweep** button.  This continuously sweeps the phase slider over the full 0–360° range at a rate set by the sweep duration slider.  Autosweep disables manual phase control while running and can be stopped at any time.

### Audio Controls

- **Schumann Band** – Select between the fundamental (7.83 Hz) and higher harmonics (up to 32.40 Hz).  The tone generator maps the selected band to an audible carrier frequency.
  - **Stimulation Mode** – Choose **Isochronic (AM)**, **Binaural**, **Spatial Echo** or **Ambient Echo**.  Isochronic modulates a single tone at the band frequency.  Binaural splits two tones between the ears with a frequency difference equal to the band frequency.  Spatial Echo plays a centre tone with delayed and pitch‑shifted echoes on the left and right; the pitch split is randomised for each session but always sums to the selected Schumann band, creating a subtle binaural beat.  **Ambient Echo** is tone-free: no carrier oscillator is mixed in.  It applies additional delayed stereo taps to the ambience layers for a low-fatigue, nature-forward field.  Changing modes while audio is running restarts the audio graph so the differences are immediately audible.
  - **Chord Instrument** – Select **None**, **Piano**, **Harp**, **Synth** or **Guitar**.  When enabled, the Lab either plays a slow three‑chord progression using the selected timbre or loads a **pre‑rendered loop** from the `assets/chords/manifest.json` file.  Each loop is a high‑quality 24‑bit/48 kHz recording of a chord sequence.  If multiple loops are available for the chosen instrument, a **Chord loop** selector appears, allowing you to pick between different progressions.  If no loops are present, the Lab falls back to synthesising chords (sine for Piano, triangle for Harp, sawtooth for Synth and square for Guitar).  Loops and synth pads both change every **30 seconds** through a cycle of major, suspended/maj7 and subdominant chords derived from the current carrier pitch.  The chord layer can be combined with any stimulation mode, including Ambient Echo, for a richer listening experience.
  - **Reverb Space** – Apply natural reverberation to the entire audio chain by selecting **Forest** or **Temple**.  The Lab loads impulse responses from the `assets/ir` directory and uses a `ConvolverNode` to simulate the acoustics of a woodland clearing or a stone temple.  Selecting **None** disables the reverb.  The wet/dry mix is pre‑balanced to preserve clarity while adding spaciousness.

  - **Band‑driven stereo motion** *(New in v2.5.0)* – To make the soundscapes and chords feel more alive, the Lab now subtly moves their position between the left and right channels at the rate of the selected Schumann band.  A low‑frequency oscillator modulates the pan of each ambient channel, creating a gentle circling motion that enhances immersion without altering the carrier tone.  The motion depth scales with the **Modulation Depth** slider, and no additional controls are needed.
- **Carrier Pitch, Modulation Depth, Master Volume** – Fine‑tune the tone generator.
  - **Soundscapes** – Blend in natural ambience: Ocean (low‑passed noise or high‑quality loop), Rain (high‑passed noise or loop), Forest Birds (tonal chirps or loop) and Waves (slow swell pattern or loop).  When Ambient Echo is selected, all soundscape layers receive additional delayed stereo taps to increase immersion without requiring high tone levels.
- **Breathing Visual** – An animated orb guides your breath.  The breathing period is quantised to integer multiples of the Schumann period; use the slider to choose durations from ~2 s to 16 s.

## Meditate Mode

Meditation mode reuses your saved best phase for the selected band.  Set a session length (5–60 minutes), adjust the soundscape levels, breathing cycle and volume, then click **Start meditation**.  The remaining time is displayed.  When the timer ends or you stop manually, the audio stops automatically.

## Journal Mode

### Session Notes

After a meditation session you can jot a quick note describing your experience.  The journal captures four prompts: **Intention**, **Thoughts**, **Gratitude** and **Integration**.  Entries are time‑stamped and stored locally.  You can export your entire journal as a plain‑text file or share it via the Web Share API.

### Phase History

The Journal lists your best phase for each Schumann band along with the number of marks recorded.  This information is saved in `localStorage` and persists between sessions.  Use the **Export history (JSON)** button to download a `schumann_history.json` file containing the data, or **Clear all history** to remove it.

## Soundscape Upgrades

The Lab supports high‑quality soundscape loops recorded at **48 kHz/24‑bit**.  Drop the following files into the app directory to upgrade the ambience:

- `ocean-wave-1.wav` – Loop of ocean swells.
- `rain.wav` – Continuous rain.
- `birds.wav` – Forest birdsong (optional).
- `waves.wav` – Slow wave set (optional).

If these files are unavailable, the Lab falls back to synthetic noise and tonal patterns.  See `SOUND_GUIDE.md` for suggestions on sourcing or creating high‑quality audio loops.

## Storage & Privacy

All data (best phases, marks, journal entries) is stored locally on your device using Web Storage.  No information is sent to a server.  Clearing your browser data or using the **Clear all history** and **Delete saved entries** buttons will remove the stored information.
