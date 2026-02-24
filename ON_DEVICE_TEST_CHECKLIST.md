# On-Device Test Checklist (iOS)

Use this checklist after significant app/audio changes.

## Setup
- [ ] App served over `http://` (not `file://`)
- [ ] Safari can load root page
- [ ] Optional Home Screen shortcut added

## Core Audio
- [ ] `Start Explore` produces audible output
- [ ] `Stop` fully silences output
- [ ] Band switching restarts graph cleanly

## Mode Checks
- [ ] Isochronic (AM) audible and stable
- [ ] Binaural mode audible via headphones
- [ ] Spatial Echo mode audible with stereo spread
- [ ] Ambient Echo mode plays ambience-only behavior

## Controls
- [ ] Carrier / Mod Depth / Master Volume update and respond
- [ ] Phase slider updates label and behavior
- [ ] Autosweep starts/stops normally
- [ ] Mark Strongest updates best-phase display

## Assets
- [ ] Chord loop selector appears when manifest+library are present
- [ ] Recommended loop appears first in dropdown
- [ ] Forest reverb loads without error
- [ ] Temple reverb loads without error

## Background / App Switching
- [ ] Start audio, then background Safari for 15-30s
- [ ] Return and record one:
  - [ ] PASS-A continued playing
  - [ ] PASS-B resumed automatically
  - [ ] WARN required manual restart
- [ ] Repeat test from Home Screen launch mode

## Persistence
- [ ] Journal entry saves and reloads after refresh
- [ ] Phase history persists after refresh
