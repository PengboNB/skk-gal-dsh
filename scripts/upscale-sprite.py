"""Lossless, identity-safe sprite upscaling with preserved alpha."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter


def upscale(source: Path, destination: Path, scale: int = 3) -> None:
    original = Image.open(source).convert("RGBA")
    size = (original.width * scale, original.height * scale)
    enlarged = original.resize(size, Image.Resampling.LANCZOS)
    alpha = enlarged.getchannel("A")
    rgb = enlarged.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=1.35, percent=115, threshold=2)
    )
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: upscale-sprite.py SOURCE DESTINATION")
    upscale(Path(sys.argv[1]), Path(sys.argv[2]))
