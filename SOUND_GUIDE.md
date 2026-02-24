# High‑Quality Soundscape Guide

The default soundscapes in the **Schumann Resonance Lab** are generated procedurally.  To elevate your experience you can supply your own **48 kHz/24‑bit** audio loops.  High‑resolution recordings preserve subtle details and reduce listening fatigue during long sessions.

## Recommended Sources

- **Field recordings** – If you have access to a portable recorder, capture your own ocean waves, rain and birdsong.  Choose a quiet location, record several minutes, and ensure a consistent ambience.  Trim the recording to a seamless loop (see below).
- **Open libraries** – There are many reputable sites offering royalty‑free nature sounds.  Examples include:
  - [BBC Sound Effects Archive](https://sound-effects.bbcrewind.co.uk/) – High‑quality field recordings released under a permissive licence.
  - [Freesound](https://freesound.org/) – A community‑driven library where you can search for “ocean loop”, “rain loop”, etc.  Check the licence and choose CC0 or Attribution recordings.
  - [Archive.org](https://archive.org/details/audio) – Search the Audio section for ambience collections.
- **Commercial libraries** – Sites such as Boom Library, Pro Sound Effects and A Sound Effect sell professional‑grade ambience packs.  These are licensed for commercial use and typically supplied at high resolutions.

## Preparing the Files

1. **Sample rate and bit depth** – Ensure your audio files are **48 kHz** sampling rate and **24‑bit** depth.  Many sources provide 44.1 kHz/16‑bit recordings; use an audio editor (e.g. Audacity, Reaper) to resample and dither up to 24‑bit if necessary.
2. **Loop points** – For a seamless loop, fade the beginning and end and align zero crossings.  Some editors offer “snap to zero” and cross‑fade tools.  Aim for loops longer than 20 seconds to reduce repetition fatigue.
3. **File names** – Save your files with the exact names expected by the app:
   - `ocean-wave-1.wav`
   - `rain.wav`
   - `birds.wav` (optional)
   - `waves.wav` (optional)
   Place them in the root of the project alongside `index.html` and `app.js`.  The service worker pre‑caches these files when present.

## Updating the Soundscapes

Once your files are prepared:

1. Drop them into the project root (or the `www/` directory in a Capacitor build).
2. Reload the web app.  The Lab will attempt to load the high‑quality loops asynchronously.  If loading fails (e.g. due to network issues or incorrect file names) it silently falls back to the procedural sounds.
3. For Capacitor projects, run `npx cap copy` to include the new files in the native build.

Enjoy a richer and more immersive soundscape during your explorations and meditation sessions!

## Additional Tips

- **Use lossless sources**: When sourcing loops, prefer **WAV** or **FLAC** files over MP3 or AAC.  Lossy compression can introduce artefacts that become distracting during repetitive listening.
- **Length matters**: Longer loops (30 seconds or more) are less fatiguing because the brain perceives fewer obvious repetitions.  You can loop shorter clips, but subtle differences between the start and end will improve the listening experience.
- **Update process**: When you replace the soundscape files with new recordings, simply drop the updated `.wav` files into the project directory and reload the web app or run `npx cap copy` for native builds.  The Lab will always attempt to use the latest files.  If you remove a file, the corresponding control will revert to the synthetic noise generator or tonal pattern.

## Spatial Echo & Musical Cues

The **Spatial Echo** stimulation mode enriches the Schumann tone with left‑ and right‑channel echoes.  To make the effect more musical and natural:

- **Vary the delays**: Use delay times between **80 ms and 150 ms** for left and right channels to create a sense of space.  Slightly different delays for each side produce a wider stereo image.
- **Pitch shifts**: Shift the echo tones up and down by **half the band frequency** (e.g. ±3.9 Hz for the fundamental) or by a musical interval (e.g. ±3 Hz).  The centre tone stays at the carrier pitch.
- **Blend with chords**: Introduce a soft **piano**, **harp**, **sweeping synth** or **acoustic guitar** pad in the centre channel.  A slowly evolving chord progression (e.g. moving through A maj → D maj → E maj) underpins the resonance and increases variety.  Ensure the chord changes are slow (30–60 seconds per chord) so they do not distract from the Schumann rhythm.
- **Natural ambience**: Consider adding subtle reverb or convolution with a real acoustic space (e.g. a forest clearing or temple).  This can be achieved by loading an impulse response into an **AudioBuffer** and convolving it with the centre tone and echoes.

Experiment with these ideas to craft a more immersive spatial echo that hints at the Schumann frequency through its echoes and tonal relationships rather than presenting it explicitly.

## Ambient Echo Mode

The **Ambient Echo** stimulation mode applies spatial delays to the soundscapes while silencing the central tone.  This creates a gentle, enveloping ambience with no explicit carrier pitch.  Use this mode to meditate with only the sounds of nature—ocean waves, rain, birds and waves—while still benefiting from the rhythmic modulation provided by the Schumann band.  You can combine Ambient Echo with the chord progression layer for a more musical soundscape.
