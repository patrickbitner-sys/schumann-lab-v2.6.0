# Architecture Diagram (v2.6.0)

```mermaid
flowchart TD
  U[User] --> UI[index.html + styles.css]
  UI --> JS[app.js]

  JS --> CTRL[UI Controls]
  JS --> ENG[Audio Engine]
  JS --> PERSIST[LocalStorage]

  ENG --> MODE[Stimulation Modes\nAM / Binaural / Spatial Echo / Ambient Echo]
  ENG --> SCAPE[Soundscapes\nOcean / Rain / Birds / Waves]
  ENG --> CHORD[Chord Layer\nSynth + Loop]
  ENG --> MIX[Master Mix Bus]
  ENG --> IR[Convolution Reverb (Parallel Wet Bus)]

  MODE --> AM[AM: carrier amplitude modulation]
  MODE --> BIN[Binaural: L/R split by band/2]
  MODE --> SPAT[Spatial Echo: center + L/R delayed echoes]
  MODE --> AMB[Ambient Echo: subtle center + L/R delayed echoes\nplus extra ambience delay taps]
  SPAT --> DF[Echo pitch split rule:\nleft offset + right offset = selected band]
  AMB --> DF

  CHORD --> MAN[assets/chords/manifest.json]
  CHORD --> PREF[assets/chords/preferences.json]
  CHORD --> LIB[assets/chords/library/*]

  MODE --> MIX
  SCAPE --> MIX
  CHORD --> MIX
  MIX --> DRY[Dry Path -> analyser -> destination]
  MIX --> IR
  IR --> WET[Wet Path -> destination]

  IR --> IRF[assets/ir/forest.wav]
  IR --> IRT[assets/ir/temple.wav]

  SCAPE --> SFILES[assets/audio/soundscapes/*]

  TOOLS[tools/*.py] --> LIB
  TOOLS --> MAN
  TOOLS --> IRF
  TOOLS --> IRT
```
