# Schumann Lab Smoke Test Checklist

Run these checks after UI/audio changes.

## 1) Boot and UI
- Start local server from repo root: `python3 -m http.server 6969`
- Open `http://localhost:6969`
- Verify tabs render: Explore, Meditate, Journal
- Verify no blocking errors in DevTools Console

## 2) Explore Core Audio
- Click `Start Explore`
- Confirm sound starts (with headphones)
- Change Band and confirm audio graph restarts cleanly
- Change Mode across all four pills and confirm audible behavior changes
- Click `Stop` and confirm all audio stops

## 3) Sliders and Labels
- Move Carrier, Mod Depth, Master Volume and confirm labels update
- Move Phase and confirm degree/ms label updates
- Start Autosweep and confirm phase moves continuously
- Click `Mark Strongest` and confirm best-phase text updates

## 4) Soundscapes
- Raise Ocean/Rain/Birds/Waves sliders one-by-one
- Confirm each layer is audible and controllable
- In Meditate tab, verify mirrored sliders stay synchronized with Explore

## 5) Chords and Reverb
- Set Chord Layer to Piano/Harp/Synth/Guitar and confirm chord texture appears
- If chord loops exist in `assets/chords/library`, verify loop dropdown appears
- Select Reverb Space `Forest` and `Temple`; verify no crashes even if IR files are missing

## 6) Meditation Session
- In Meditate, set a short session length (1-2 min) and start
- Confirm timer counts down
- Confirm stop works manually

## 7) Journal
- Save a journal entry
- Confirm entry appears in list
- Export entries and clear entries actions work
- Export/Clear phase history works

## 8) Reload Persistence
- Reload page
- Confirm phase history and journal entries are restored from localStorage

## 9) Mobile Sanity (optional)
- Open on phone/tablet browser
- Verify layout is usable and controls are reachable
- Confirm audio can start only after user interaction (expected policy)
