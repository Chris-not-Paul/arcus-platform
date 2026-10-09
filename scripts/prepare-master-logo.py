from collections import deque
from pathlib import Path
import sys

from PIL import Image


def is_background(pixel):
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 242 and max(red, green, blue) - min(red, green, blue) <= 10


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: prepare-master-logo.py INPUT OUTPUT")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    queue = deque()
    visited = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not is_background(pixels[x, y]):
            continue

        visited.add((x, y))
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)

        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        left, top, right, bottom = bounds
        padding = 8
        image = image.crop((
            max(0, left - padding),
            max(0, top - padding),
            min(width, right + padding),
            min(height, bottom + padding),
        ))

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)


if __name__ == "__main__":
    main()
