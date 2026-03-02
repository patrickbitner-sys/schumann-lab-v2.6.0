# Architecture Diagram (v2.6.6)

```mermaid
flowchart TD
  U[User] --> UI[index.html + styles.css]
  UI --> JS[app.js]

  JS --> CTRL[UI Controls]
  JS --> ENG[Audio Engine]
  JS --> PERSIST[LocalStorage]
  CTRL --> PHASECTL[Phase Controls\nSlider / Autosweep / A/B Finder]
  CTRL --> DEVAUD[Developer Audio Tuning\nhidden by checkbox]
  DEVAUD --> PRESET[Preset Mapper\nCalm / Balanced / Deep]
  DEVAUD --> IRTUNE[IR Tuning Sliders\ntrim/duration/lp/wet/send]

  ENG --> MODE[Stimulation Modes\nAM / Binaural / Spatial Echo / Ambient Echo]
  ENG --> PBUS[Tone Phase Bus\nR delay derived from phase slider]
  ENG --> SCAPE[Soundscapes\nOcean / Rain / Birds / Waves]
  ENG --> CHORD[Chord Layer\nSynth + Loop]
  ENG --> MIX[Master Mix Bus]
  ENG --> IR[Convolution Reverb (Parallel Wet Bus)]
  ENG --> IRPROC[IR Preprocess\nnormalize + tail shape + cache]

  MODE --> AM[AM: carrier amplitude modulation]
  MODE --> BIN[Binaural: L/R split by band/2]
  MODE --> SPAT[Spatial Echo: center + L/R delayed echoes]
  MODE --> AMB[Ambient Echo: tone-free ambience\nplus extra ambience delay taps]
  SPAT --> DF[Echo pitch split rule:\nleft offset + right offset = selected band]

  CHORD --> MAN[assets/chords/manifest.json]
  CHORD --> MANM[assets/chords/manifest.mobile.json]
  CHORD --> PREF[assets/chords/preferences.json]
  CHORD --> LIB[assets/chords/library/*]

  MODE --> PBUS
  PBUS --> MIX
  SCAPE --> MIX
  CHORD --> MIX
  MIX --> DRY[Dry Path -> analyser -> destination]
  MIX --> SEND[IR Send Gain]
  SEND --> IR
  IR --> WET[Wet Path -> HP/LP/Comp -> analyser]
  PRESET --> IRTUNE
  IRTUNE --> IRPROC
  IRPROC --> IR

  IRPROC --> IRF[assets/ir/forest.wav]
  IRPROC --> IRT[assets/ir/temple.wav]

  SCAPE --> SFILES[assets/audio/soundscapes/*]

  TOOLS[tools/*.py] --> LIB
  TOOLS --> MAN
  TOOLS --> IRF
  TOOLS --> IRT
```
