"""Convert ImageGen's baked checker preview into a real transparent sprite.

The flood fill starts only at the canvas border, so white costume and hair regions
inside the outlined character are retained while connected checker pixels are
removed. This is a project build helper, not a runtime dependency.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    # Checker cells are neutral 245-255 gray. A small tolerance also catches
    # JPEG-like and antialiased variations around the generated silhouette.
    return min(rgb) >= 238 and max(rgb) - min(rgb) <= 10


def extract(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    outside = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if outside[index] or not is_background(pixels[x, y][:3]):
            return
        outside[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    for y in range(height):
        for x in range(width):
            if outside[y * width + x]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract-generated-alpha.py SOURCE DESTINATION")
    extract(Path(sys.argv[1]), Path(sys.argv[2]))
