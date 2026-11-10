#!/usr/bin/env python3
"""PNG icons for the hello. home screen. No third-party image library."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
PAPER = (243, 239, 230, 255)
INK = (28, 25, 23, 255)
HELLO = (226, 59, 47, 255)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        ny = (y + 0.5) / size
        for x in range(size):
            nx = (x + 0.5) / size
            ring = ((nx - 0.40) ** 2 + (ny - 0.46) ** 2) ** 0.5
            period = ((nx - 0.66) ** 2 + (ny - 0.64) ** 2) ** 0.5
            if period < 0.055:
                raw.extend(HELLO)
            elif 0.115 < ring < 0.175:
                raw.extend(INK)
            else:
                raw.extend(PAPER)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    write_png(ROOT / "icon-192.png", 192)
    write_png(ROOT / "icon-512.png", 512)
    write_png(ROOT / "apple-touch-icon.png", 180)
    print("icons", ROOT)


if __name__ == "__main__":
    main()
