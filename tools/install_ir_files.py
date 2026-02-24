#!/usr/bin/env python3
"""Install two impulse response files for Schumann Lab.

Usage:
  python tools/install_ir_files.py --forest /path/to/forest.wav --temple /path/to/temple.wav

This copies files without re-encoding to:
  assets/ir/forest.wav
  assets/ir/temple.wav
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def copy_ir(src: Path, dst: Path) -> None:
  if not src.exists() or not src.is_file():
    raise FileNotFoundError(f"Missing file: {src}")
  dst.parent.mkdir(parents=True, exist_ok=True)
  shutil.copyfile(src, dst)


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--forest", required=True, help="Path to forest IR file")
  parser.add_argument("--temple", required=True, help="Path to temple/hall IR file")
  parser.add_argument("--project_root", default=".", help="Project root (default: current dir)")
  args = parser.parse_args()

  root = Path(args.project_root).resolve()
  forest_src = Path(args.forest).expanduser().resolve()
  temple_src = Path(args.temple).expanduser().resolve()

  copy_ir(forest_src, root / "assets" / "ir" / "forest.wav")
  copy_ir(temple_src, root / "assets" / "ir" / "temple.wav")

  print("Installed:")
  print(f"  {root / 'assets' / 'ir' / 'forest.wav'}")
  print(f"  {root / 'assets' / 'ir' / 'temple.wav'}")


if __name__ == "__main__":
  main()
