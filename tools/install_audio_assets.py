#!/usr/bin/env python3
"""
Install Schumann Lab audio assets into the expected folder structure WITHOUT re-encoding.

Usage (from project root):
  python tools/install_audio_assets.py --samples "Schumann-App_Audio-Samples.zip" \
      --forest "Forest-in-WheldrakeWood.zip" --york "york-minster.zip" \
      --soundscapes "C:/path/to/your/soundscapes_folder_or_zip"

Arguments:
  --samples     Required. Zip containing chord loops / samples (your Schumann-App_Audio-Samples.zip).
  --forest      Required. Forest IR zip (Forest-in-WheldrakeWood.zip).
  --york        Required. York Minster IR zip (york-minster.zip).
  --soundscapes Optional. Folder or .zip containing ambient files for ocean/rain/birds/waves.

What it does:
- Extracts chord WAVs from the samples pack into: assets/chords/library/
- Extracts IR WAVs into: assets/ir/library/ and installs:
    assets/ir/forest.wav
    assets/ir/temple.wav
- Optionally installs soundscapes into: assets/audio/soundscapes/
    ocean.wav, rain.wav, birds.wav, waves.wav
  (Keeps original bit depth & sample rate; just copies bytes.)

No audio is re-sampled, re-encoded, normalized, or truncated.
"""

from __future__ import annotations
import argparse
import os
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

AUDIO_EXT_RE = re.compile(r"\.(wav|mp3|ogg)$", re.I)

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def copy_as_is(src: Path, dst: Path) -> None:
    ensure_dir(dst.parent)
    shutil.copyfile(src, dst)

def extract_zip(zip_path: Path, dest_dir: Path) -> None:
    ensure_dir(dest_dir)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(dest_dir)

def extract_matching(zip_path: Path, predicate, dest_dir: Path) -> int:
    count = 0
    ensure_dir(dest_dir)
    with zipfile.ZipFile(zip_path, "r") as z:
        for name in z.namelist():
            if name.endswith("/"):
                continue
            if not predicate(name):
                continue
            fname = os.path.basename(name)
            out_path = dest_dir / fname
            with z.open(name, "r") as src, open(out_path, "wb") as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)
            count += 1
    return count

def score_name(name: str, keyword: str) -> int:
    n = name.lower()
    k = keyword.lower()
    score = 0
    if k in n:
        score += 100
    if n.endswith(".wav"):
        score += 10
    if "48k" in n:
        score += 2
    if "24" in n:
        score += 1
    # prefer "omni/ortf/ms" style captures for natural headphone cues
    if "ortf" in n:
        score += 2
    if "ms" in n:
        score += 1
    if "omni" in n:
        score += 1
    return score

def pick_best(files: list[Path], keyword: str) -> Path | None:
    best = None
    best_score = -1
    for p in files:
        if not p.is_file():
            continue
        if not AUDIO_EXT_RE.search(p.name):
            continue
        s = score_name(p.name, keyword)
        if s > best_score:
            best_score = s
            best = p
    return best

def install_irs(forest_zip: Path, york_zip: Path, project_root: Path) -> None:
    ir_lib = project_root / "assets" / "ir" / "library"
    ensure_dir(ir_lib)

    tmp = Path(tempfile.mkdtemp(prefix="schumann_ir_"))
    try:
        extract_zip(forest_zip, tmp / "forest")
        extract_zip(york_zip, tmp / "york")

        # Preserve entire original trees under library/
        # (We keep folders intact by copying extracted dirs.)
        src_forest = tmp / "forest"
        src_york = tmp / "york"
        # Copy extracted directories into library (preserve structure)
        for src in [src_forest, src_york]:
            for item in src.iterdir():
                # Skip macOS metadata
                if item.name == "__MACOSX":
                    continue
                dst = ir_lib / item.name
                if dst.exists():
                    shutil.rmtree(dst, ignore_errors=True)
                if item.is_dir():
                    shutil.copytree(item, dst)
                else:
                    shutil.copy2(item, dst)

        # Choose best headphone IRs (stereo preferred).
        forest_candidates = list((ir_lib / "Forest-in-WheldrakeWood").rglob("*.wav"))
        york_candidates   = list((ir_lib / "york-minster").rglob("*.wav"))

        forest_best = None
        # Prefer MS-decoded stereo file if present
        for p in forest_candidates:
            if p.name.lower() == "s1r1_ms.wav":
                forest_best = p
                break
        if not forest_best:
            forest_best = pick_best(forest_candidates, "ms") or pick_best(forest_candidates, "sf") or pick_best(forest_candidates, "forest")

        york_best = None
        for p in york_candidates:
            if p.name.lower() == "minster1_000_ortf_48k.wav":
                york_best = p
                break
        if not york_best:
            york_best = pick_best(york_candidates, "ortf") or pick_best(york_candidates, "stereo") or pick_best(york_candidates, "minster")

        if forest_best:
            copy_as_is(forest_best, project_root / "assets" / "ir" / "forest.wav")
            print(f"[ir] Installed forest.wav from: {forest_best}")
        else:
            print("[ir] WARNING: Could not find a forest IR .wav")

        if york_best:
            copy_as_is(york_best, project_root / "assets" / "ir" / "temple.wav")
            print(f"[ir] Installed temple.wav from: {york_best}")
        else:
            print("[ir] WARNING: Could not find a york/minster IR .wav")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def install_chords(samples_zip: Path, project_root: Path) -> None:
    chords_lib = project_root / "assets" / "chords" / "library"
    ensure_dir(chords_lib)

    def is_chord_wav(name: str) -> bool:
        n = name.lower()
        return n.endswith(".wav") and "cool keys vol. 2" in n

    count = extract_matching(samples_zip, is_chord_wav, chords_lib)
    print(f"[chords] Extracted {count} WAV(s) into {chords_lib}")

def gather_files_from_source(src: Path) -> tuple[list[Path], Path | None]:
    """Return (files, tmpdir) where tmpdir must be cleaned up by caller."""
    if src.is_dir():
        return [p for p in src.rglob("*") if p.is_file()], None
    if src.is_file() and src.suffix.lower() == ".zip":
        tmp = Path(tempfile.mkdtemp(prefix="schumann_soundscapes_"))
        extract_zip(src, tmp)
        return [p for p in tmp.rglob("*") if p.is_file()], tmp
    return [], None

def install_soundscapes(soundscapes: str | None, project_root: Path) -> None:
    if not soundscapes:
        print("[soundscapes] Skipped (no --soundscapes provided).")
        return
    src = Path(soundscapes)
    files, tmp = gather_files_from_source(src)
    try:
        if not files:
            print(f"[soundscapes] No files found in: {soundscapes}")
            return

        dest = project_root / "assets" / "audio" / "soundscapes"
        ensure_dir(dest)

        mapping = {
            "ocean": "ocean.wav",
            "rain":  "rain.wav",
            "birds": "birds.wav",
            "waves": "waves.wav",
        }

        for k, out_name in mapping.items():
            best = pick_best(files, k)
            if not best:
                print(f"[soundscapes] WARNING: No match found for {k} in {soundscapes}")
                continue
            copy_as_is(best, dest / out_name)
            print(f"[soundscapes] Installed {k} -> {dest/out_name} (from {best})")
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", required=True, help="Path to Schumann-App_Audio-Samples.zip")
    ap.add_argument("--forest", required=True, help="Path to Forest-in-WheldrakeWood.zip")
    ap.add_argument("--york", required=True, help="Path to york-minster.zip")
    ap.add_argument("--soundscapes", help="Optional: folder or .zip containing ambient audio for ocean/rain/birds/waves")
    ap.add_argument("--project_root", default=".", help="Project root (default: current dir)")
    args = ap.parse_args()

    root = Path(os.path.abspath(args.project_root))
    install_chords(Path(args.samples), root)
    install_irs(Path(args.forest), Path(args.york), root)
    install_soundscapes(args.soundscapes, root)

    print("\nDone. Next:")
    print("  1) Run: npx http-server -p 6969")
    print("  2) Open: http://localhost:6969")
    print("  3) DevTools -> Network filter 'wav' to verify loads")

if __name__ == "__main__":
    main()
