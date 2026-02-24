#!/usr/bin/env python3
"""Lightweight release automation for v2.6.x.

Usage:
  python3 tools/release_v26.py 2.6.1
  python3 tools/release_v26.py v2.6.1 --push
  python3 tools/release_v26.py 2.6.2 --dry-run
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import subprocess
from pathlib import Path


def run(cmd: list[str], cwd: Path, capture: bool = True) -> str:
  result = subprocess.run(
    cmd,
    cwd=str(cwd),
    text=True,
    check=True,
    capture_output=capture,
  )
  return (result.stdout or "").strip()


def normalize_version(raw: str) -> str:
  v = raw[1:] if raw.startswith("v") else raw
  if not re.fullmatch(r"2\.6\.\d+", v):
    raise SystemExit("Version must match 2.6.x (example: 2.6.1)")
  return v


def ensure_repo_ready(root: Path, version: str, *, require_clean: bool) -> None:
  inside = run(["git", "rev-parse", "--is-inside-work-tree"], root)
  if inside != "true":
    raise SystemExit("Current directory is not a git repository")

  branch = run(["git", "branch", "--show-current"], root)
  if branch != "main":
    raise SystemExit(f"Release must run from main branch (current: {branch})")

  status = run(["git", "status", "--porcelain"], root)
  if status and require_clean:
    raise SystemExit("Working tree is not clean. Commit/stash changes first.")

  existing = run(["git", "tag", "--list", f"v{version}"], root)
  if existing:
    raise SystemExit(f"Tag v{version} already exists")


def replace_or_fail(path: Path, pattern: str, repl: str, *, count: int = 0) -> None:
  text = path.read_text(encoding="utf-8")
  new_text, n = re.subn(pattern, repl, text, count=count, flags=re.MULTILINE)
  if n == 0:
    raise SystemExit(f"Failed to update {path}: pattern not found")
  path.write_text(new_text, encoding="utf-8")


def update_version_files(root: Path, version: str, date_str: str) -> Path:
  baseline = root / "BASELINE_VERSION.md"
  readme = root / "README.md"
  app_js = root / "app.js"

  replace_or_fail(
    baseline,
    r"(Current baseline:\s+\*\*)v\d+\.\d+\.\d+(\*\*)",
    rf"\1v{version}\2",
    count=1,
  )
  replace_or_fail(
    baseline,
    r"(Date:\s+\*\*)\d{{4}}-\d{{2}}-\d{{2}}(\*\*)",
    rf"\1{date_str}\2",
    count=1,
  )

  replace_or_fail(
    readme,
    r"^# Schumann Lab v\d+\.\d+\.\d+$",
    f"# Schumann Lab v{version}",
    count=1,
  )
  replace_or_fail(
    readme,
    r"- Current baseline: `v\d+\.\d+\.\d+`",
    f"- Current baseline: `v{version}`",
    count=1,
  )

  replace_or_fail(
    app_js,
    r"(Schumann Resonance Lab . Extended & Synced Version \()v\d+\.\d+\.\d+(\))",
    rf"\1v{version}\2",
    count=1,
  )

  notes = root / "docs" / f"RELEASE_NOTES_v{version}.md"
  if not notes.exists():
    notes.write_text(
      "\n".join([
        f"# Release Notes - v{version} ({date_str})",
        "",
        "## Added",
        "- TBD",
        "",
        "## Changed",
        "- TBD",
        "",
        "## Fixed",
        "- TBD",
        "",
        "## Notes",
        "- Update docs/diagram if architecture changed.",
        "",
      ]),
      encoding="utf-8",
    )

  return notes


def main() -> None:
  parser = argparse.ArgumentParser(description="Release helper for Schumann Lab v2.6.x")
  parser.add_argument("version", help="Version number (example: 2.6.1 or v2.6.1)")
  parser.add_argument("--date", dest="date", help="Release date YYYY-MM-DD (default: today)")
  parser.add_argument("--push", action="store_true", help="Push main and tag to origin")
  parser.add_argument("--dry-run", action="store_true", help="Validate and print actions only")
  args = parser.parse_args()

  root = Path(__file__).resolve().parent.parent
  version = normalize_version(args.version)
  date_str = args.date or dt.date.today().isoformat()

  if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
    raise SystemExit("--date must be YYYY-MM-DD")

  ensure_repo_ready(root, version, require_clean=not args.dry_run)

  print(f"Preparing release v{version} (date: {date_str})")
  if args.dry_run:
    print("Dry run: branch/tag validation passed.")
    if run(["git", "status", "--porcelain"], root):
      print("Dry run note: working tree is dirty (allowed in dry-run mode).")
    print("Would update: BASELINE_VERSION.md, README.md, app.js, docs/RELEASE_NOTES_vX.md")
    print("Would commit and create tag.")
    if args.push:
      print("Would push main and tag to origin.")
    return

  notes_path = update_version_files(root, version, date_str)

  run(["git", "add", "BASELINE_VERSION.md", "README.md", "app.js", str(notes_path.relative_to(root))], root)
  run(["git", "commit", "-m", f"Release v{version}"], root)
  run(["git", "tag", "-a", f"v{version}", "-m", f"Schumann Lab release v{version}"], root)

  if args.push:
    run(["git", "push", "origin", "main"], root)
    run(["git", "push", "origin", f"v{version}"], root)

  print(f"Release complete: v{version}")
  if not args.push:
    print("Next: git push origin main && git push origin v" + version)


if __name__ == "__main__":
  main()
