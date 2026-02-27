# Software Requirements

This project is a **Progressive Web Application (PWA)** that runs entirely in the browser.  It does not require a back‑end server.  To edit, extend or migrate the app, the following tools are recommended:

## Development Environment

- **Node.js 16 LTS or newer** – While the app itself does not rely on Node at runtime, the Capacitor CLI (for native builds) and optional bundler tasks require a recent Node environment.  You can download Node from [nodejs.org](https://nodejs.org/en/).
- **NPM 8 or newer** – Comes bundled with Node.  Used to install Capacitor and any additional packages.
- **A modern browser** – The PWA relies on the Web Audio API, Web Storage and the Web Share API.  Recent versions of Chrome, Edge, Firefox or Safari are recommended.  For iOS devices, Safari 16 or later is required to access haptic feedback and audio features reliably.

## Runtime Requirements

The app uses the Web Audio API to generate tones, binaural beats and soundscapes.  It attempts to open an `AudioContext` at **96 kHz** for maximum fidelity.  If the device cannot support this sample rate, the browser falls back to its preferred rate.  For best results:

- Use high‑quality headphones.  Balanced, over‑ear headphones tend to produce clearer binaural separation than phone speakers.
- Keep your device’s system volume at a moderate level and use the app’s **Master volume** slider to adjust loudness.

### Diagnostics and Self‑Test (Optional)

The Lab includes an optional **Self‑Test & Diagnostics** panel (hidden under an advanced toggle).  This tool runs a series of checks to verify that your browser supports the Web Audio API, speech synthesis, local storage, vibration and service worker caching.  Each test reports **PASS**, **WARN** or **FAIL**, and you can copy the results for troubleshooting.  See `ON_DEVICE_TEST_CHECKLIST.md` for a step‑by‑step procedure to validate the app on your iPhone or iPad.

### Stimulation Modes

The Lab supports four stimulation modes selectable via the **Isochronic (AM)**, **Binaural**, **Spatial Echo** and **Ambient Echo** pills on the Explore tab.  Each mode uses a different synthesis technique:

* **Isochronic (AM)** – A single tone at the selected **Carrier pitch** is amplitude‑modulated at the Schumann band frequency.  The result is a **pulsing waveform** where the rate matches the chosen band (e.g. 7.83 pulses s⁻¹ for the fundamental).  This mode is monaural and does not rely on stereo separation.
* **Binaural** – Two oscillators are presented independently to the left and right ears.  Their frequencies differ by exactly the Schumann band frequency (half the difference added to each side).  For example, if the carrier pitch is 230 Hz and the band is 7.83 Hz, the left ear hears **233.915 Hz** and the right ear hears **226.085 Hz**.  The perceived binaural beat at 7.83 Hz arises in the listener’s brain.
* **Spatial Echo** – A centre tone plays at the carrier pitch while two echoes, pitch‑shifted up and down, are delayed and panned hard left/right.  At each start of the audio graph the Lab randomises how the Schumann band is split between the left and right echoes: one side may be raised by 20 % of the band and the other lowered by 80 %, or vice versa.  The two offsets always sum to the selected band frequency, preserving the binaural beat while creating a more organic, evolving stereo image.  You can further enhance this effect by supplying your own chord loops and reverb (see `AUDIO_ASSETS.md` and `IR_GUIDE.md`).
* **Ambient Echo** – Uses a **very low-level carrier anchor** plus delayed, left/right pitch‑split echoes where the two offsets always sum to the selected Schumann band.  This preserves band perception with less listening fatigue than a full-level carrier.  In parallel, Ambient Echo adds delayed spatial taps to the soundscape layers (ocean/rain/birds/waves) to create a gently immersive field.  Ideal for nature-forward meditation while still maintaining subtle Schumann-band cueing.

Changing modes while audio is running will restart the audio graph with the new configuration so the difference is immediately audible.

### Chord Progression Layer

  An optional **Chord Progression** layer can accompany any stimulation mode.  When enabled, the Lab either plays a synthesised triad progression derived from the carrier pitch or loops a pre‑rendered chord pad.  You can choose one of four instruments:

* **None** – No chord layer is added.
* **Piano** – Uses smooth sine waves to approximate a mellow piano pad.
* **Harp** – Uses triangle waves for a plucked harp‑like quality.
* **Synth** – Uses sawtooth waves for a rich synthesizer texture.
* **Guitar** – Uses square waves for a woody, guitar‑like tone.

  By default, the Lab synthesises three simple triads (major, suspended/maj7 and subdominant) which cycle every **30 seconds**.  If you provide a `manifest.json` in the `assets/chords` folder describing available loops for each instrument, the Lab will offer a **Chord loop** selector.  Selecting a loop loads and plays your high‑quality audio instead of the synthesised pads.  See `AUDIO_ASSETS.md` for details.  Changing the instrument, loop or enabling/disabling the layer restarts the audio graph so the new sound applies immediately.

### Convolution Reverb (Reverb Space)

The Lab includes an optional **convolution reverb** stage that simulates real acoustic spaces.  On the Explore tab a **Reverb space** selector lets you choose **None**, **Forest** or **Temple**:

* **None** – Disables the reverb stage.  The dry signal is routed directly to the master output.
* **Forest** – Loads `assets/ir/forest.wav` and uses a `ConvolverNode` to apply the impulse response of a woodland clearing.  The reverb is subtle, adding a gentle sense of space without overwhelming the core tones and soundscapes.
* **Temple** – Loads `assets/ir/temple.wav` to simulate a large stone hall or cathedral.  This reverb has a longer tail and creates a more ethereal ambience.

Impulse response WAV files must be stored in the `assets/ir` folder and can be replaced with your own recordings.  See `IR_GUIDE.md` for instructions on sourcing or creating impulse responses and how they are decoded by the app.  Changing the reverb space restarts the audio graph to apply the new convolution.

## Building for Native Platforms

To deploy the PWA as a native iOS or Android app you can use **Capacitor**.  See `CAPACITOR_MIGRATION.md` in this repository for detailed instructions.

## Optional Bundling

The current version of the Lab is unbundled.  All scripts and styles are loaded directly in the browser.  If you wish to optimise the app for distribution (e.g., minify JavaScript or bundle assets), you can use tools such as **Vite**, **Parcel** or **Webpack**.  These are not required but may improve load times for slow networks.
