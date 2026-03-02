#!/usr/bin/env python3
"""
Very small markdown-to-PDF utility (plain text rendering only).

Usage:
  python3 tools/markdown_to_pdf_simple.py input.md output.pdf
"""

from __future__ import annotations

import re
import sys
import textwrap
from pathlib import Path


PAGE_WIDTH_PT = 612
PAGE_HEIGHT_PT = 792
MARGIN_LEFT = 52
MARGIN_TOP = 56
LINE_HEIGHT = 14
MAX_CHARS = 95
MAX_LINES_PER_PAGE = 48


def _pdf_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _normalize_markdown(md: str) -> list[str]:
    lines: list[str] = []
    in_code = False

    for raw in md.splitlines():
        line = raw.rstrip()

        if line.strip().startswith("```"):
            in_code = not in_code
            continue

        if in_code:
            wrapped = textwrap.wrap(line if line else " ", width=MAX_CHARS, break_long_words=False)
            lines.extend([f"    {w}" for w in wrapped] if wrapped else [""])
            continue

        if not line.strip():
            lines.append("")
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1:
                lines.append(text.upper())
                lines.append("=" * min(len(text), MAX_CHARS))
            elif level == 2:
                lines.append(text)
                lines.append("-" * min(len(text), MAX_CHARS))
            else:
                lines.append(text)
            lines.append("")
            continue

        bullet = re.match(r"^\s*[-*]\s+(.*)$", line)
        if bullet:
            text = f"- {bullet.group(1).strip()}"
            wrapped = textwrap.wrap(text, width=MAX_CHARS, break_long_words=False)
            if wrapped:
                lines.append(wrapped[0])
                lines.extend([f"  {w}" for w in wrapped[1:]])
            else:
                lines.append("-")
            continue

        numbered = re.match(r"^\s*(\d+)\.\s+(.*)$", line)
        if numbered:
            prefix = f"{numbered.group(1)}. "
            wrapped = textwrap.wrap(
                numbered.group(2).strip(),
                width=MAX_CHARS - len(prefix),
                break_long_words=False,
            )
            if wrapped:
                lines.append(prefix + wrapped[0])
                lines.extend([" " * len(prefix) + w for w in wrapped[1:]])
            else:
                lines.append(prefix)
            continue

        plain = re.sub(r"`([^`]*)`", r"\1", line)
        wrapped = textwrap.wrap(plain, width=MAX_CHARS, break_long_words=False)
        lines.extend(wrapped if wrapped else [""])

    while lines and lines[-1] == "":
        lines.pop()

    return lines


def _paginate(lines: list[str]) -> list[list[str]]:
    pages: list[list[str]] = []
    for i in range(0, len(lines), MAX_LINES_PER_PAGE):
        pages.append(lines[i : i + MAX_LINES_PER_PAGE])
    return pages or [["(empty)"]]


def _content_stream(page_lines: list[str], page_num: int, total_pages: int) -> bytes:
    y_start = PAGE_HEIGHT_PT - MARGIN_TOP
    cmds = [
        "BT",
        f"/F1 11 Tf",
        f"{MARGIN_LEFT} {y_start} Td",
        f"{LINE_HEIGHT} TL",
    ]

    for line in page_lines:
        if line == "":
            cmds.append("T*")
        else:
            cmds.append(f"({_pdf_escape(line)}) Tj")
            cmds.append("T*")

    cmds.append("ET")

    footer = f"Page {page_num} of {total_pages}"
    cmds.extend(
        [
            "BT",
            "/F1 9 Tf",
            f"{PAGE_WIDTH_PT - 120} 24 Td",
            f"({_pdf_escape(footer)}) Tj",
            "ET",
        ]
    )

    return ("\n".join(cmds) + "\n").encode("latin-1", errors="replace")


def build_pdf(lines: list[str], out_path: Path) -> None:
    pages = _paginate(lines)
    objects: list[bytes] = []

    # 1: Catalog, 2: Pages container.
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")

    page_obj_ids = []
    content_obj_ids = []
    next_id = 3
    for _ in pages:
        page_obj_ids.append(next_id)
        content_obj_ids.append(next_id + 1)
        next_id += 2

    font_obj_id = next_id

    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    pages_obj = f"<< /Type /Pages /Count {len(pages)} /Kids [{kids}] >>".encode("ascii")
    objects.append(pages_obj)

    total_pages = len(pages)
    for idx, page_lines in enumerate(pages, start=1):
        page_obj_id = page_obj_ids[idx - 1]
        content_obj_id = content_obj_ids[idx - 1]
        page_obj = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH_PT} {PAGE_HEIGHT_PT}] "
            f"/Resources << /Font << /F1 {font_obj_id} 0 R >> >> "
            f"/Contents {content_obj_id} 0 R >>"
        ).encode("ascii")
        objects.append(page_obj)

        stream = _content_stream(page_lines, idx, total_pages)
        content_obj = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("ascii")
            + stream
            + b"endstream"
        )
        objects.append(content_obj)

    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode("ascii")
    )

    out_path.write_bytes(pdf)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python3 tools/markdown_to_pdf_simple.py input.md output.pdf")
        return 2

    src = Path(sys.argv[1]).resolve()
    dst = Path(sys.argv[2]).resolve()
    if not src.exists():
        print(f"Input not found: {src}")
        return 1

    text = src.read_text(encoding="utf-8")
    lines = _normalize_markdown(text)
    dst.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(lines, dst)
    print(f"Wrote PDF: {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
