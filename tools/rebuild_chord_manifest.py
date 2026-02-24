#!/usr/bin/env python3
"""Rebuild assets/chords/manifest.json from assets/chords/library.

Grouping heuristic:
- filenames containing PNO -> piano
- filenames containing HCRD or HARP -> harp
- filenames containing GTR or GUITAR -> guitar
- all others -> synth
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def infer_instrument(name: str) -> str:
  n = name.lower()
  if "pno" in n or "piano" in n:
    return "piano"
  if "hcrd" in n or "harp" in n:
    return "harp"
  if "gtr" in n or "guitar" in n:
    return "guitar"
  return "synth"


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--project_root", default=".", help="Project root")
  args = parser.parse_args()

  root = Path(args.project_root).resolve()
  lib = root / "assets" / "chords" / "library"
  out = root / "assets" / "chords" / "manifest.json"

  manifest = {"piano": [], "harp": [], "synth": [], "guitar": []}

  lib.mkdir(parents=True, exist_ok=True)
  audio_files = [
    p for p in lib.rglob("*")
    if p.is_file() and p.suffix.lower() in {".wav", ".mp3", ".ogg"}
  ]
  if not audio_files and out.exists():
    print(f"No audio files found in {lib}; leaving existing manifest unchanged.")
    return

  for path in sorted(audio_files):
    rel = path.relative_to(root / "assets" / "chords").as_posix()
    instrument = infer_instrument(path.name)
    manifest[instrument].append({
      "file": rel,
      "name": path.stem.replace("_", " ")
    })

  out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
  counts = {k: len(v) for k, v in manifest.items()}
  print(f"Wrote {out}")
  print("Counts:", counts)


if __name__ == "__main__":
  main()
