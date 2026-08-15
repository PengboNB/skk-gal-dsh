"""Transfer the trusted original sprite alpha mask to a restored image."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter


def apply(restored_path: Path, reference_path: Path, destination: Path) -> None:
    restored = Image.open(restored_path).convert("RGBA")
    reference = Image.open(reference_path).convert("RGBA")
    alpha = reference.getchannel("A").resize(restored.size, Image.Resampling.LANCZOS)
    # A very small blur softens resampling stair-steps without expanding the
    # silhouette enough to reveal the generated checker backdrop.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    restored.putalpha(alpha)
    destination.parent.mkdir(parents=True, exist_ok=True)
    restored.save(destination, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: apply-reference-alpha.py RESTORED REFERENCE DESTINATION")
    apply(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
