"""Create a zip bundle of the poker web stack for distribution."""
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
INCLUDE = [
    "api",
    "frontend",
    "opponents",
    "poker",
    "requirements.txt",
    "docs/POKER_WEB.md",
    "README.md",
]
EXCLUDE_SUFFIXES = {".pyc", ".pyo"}
EXCLUDE_NAMES = {"__pycache__", ".git", "dist"}


def should_skip(path: Path) -> bool:
    if path.name in EXCLUDE_NAMES:
        return True
    if path.suffix in EXCLUDE_SUFFIXES:
        return True
    parts = set(path.parts)
    if parts & EXCLUDE_NAMES:
        return True
    return False


def add_path(zip_file: zipfile.ZipFile, base: Path, target: Path) -> None:
    if should_skip(target):
        return
    if target.is_dir():
        for child in target.iterdir():
            add_path(zip_file, base, child)
    else:
        arcname = target.relative_to(base)
        zip_file.write(target, arcname)


def main() -> None:
    DIST.mkdir(exist_ok=True)
    zip_path = DIST / "poker_web_bundle.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for entry in INCLUDE:
            target = ROOT / entry
            if not target.exists():
                continue
            add_path(zf, ROOT, target)
    print(f"Wrote {zip_path}")


if __name__ == "__main__":
    main()
