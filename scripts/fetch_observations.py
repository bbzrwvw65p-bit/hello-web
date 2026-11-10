#!/usr/bin/env python3
"""Save Apple's public refurbished-Mac grid (Spain) as dated observations.

The page embeds window.REFURB_GRID_BOOTSTRAP with memory, capacity, year,
screen and the EUR price. Displays are skipped. Re-run to refresh the file;
the committed copy is the snapshot the model was checked against.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "market" / "observations.json"
URL = "https://www.apple.com/es/shop/refurbished/mac"
OBSERVED_ON = date.today().isoformat()

FAMILY = {
    "macbookair": "macbook-air",
    "macbookpro": "macbook-pro",
    "macbookneo": "macbook-neo",
    "imac": "imac",
    "macmini": "mac-mini",
    "macstudio": "mac-studio",
    "macpro": "mac-pro",
}


def parse_size(token: str | None) -> float | None:
    if not token:
        return None
    match = re.search(r"(\d+)", token)
    return float(match.group(1)) if match else None


def parse_gb(token: str | None) -> int | None:
    if not token:
        return None
    match = re.search(r"(\d+)\s*(tb|gb)", token.lower())
    if not match:
        return None
    number = int(match.group(1))
    return number * 1024 if match.group(2) == "tb" else number


def chip_from(title: str) -> str | None:
    match = re.search(r"(A18\s*Pro|M\d(?:\s*(?:Pro|Max|Ultra))?)", title, re.I)
    if not match:
        return None
    text = re.sub(r"\s+", " ", match.group(1)).strip()
    return text[0].upper() + text[1:]


def cores(title: str, kind: str) -> int | None:
    match = re.search(rf"{kind} de\s*(\d+)", title, re.I)
    return int(match.group(1)) if match else None


def fetch_html() -> str:
    request = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "Accept-Language": "es-ES,es;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def observations_from(html: str) -> list[dict]:
    match = re.search(r"window\.REFURB_GRID_BOOTSTRAP = (\{.*?\});\s*</script>", html, re.S)
    if not match:
        raise SystemExit("No se encontró REFURB_GRID_BOOTSTRAP")
    grid = json.loads(match.group(1))
    seen: set[str] = set()
    rows: list[dict] = []
    for tile in grid["tiles"]:
        dims = tile["filters"]["dimensions"]
        family = FAMILY.get(dims.get("refurbClearModel") or "")
        if not family:
            continue
        part = tile["partNumber"]
        if part in seen:
            continue
        seen.add(part)
        title = tile["title"].replace("\xa0", " ")
        url = tile["productDetailsUrl"]
        if url.startswith("/"):
            url = "https://www.apple.com" + url.split("?")[0]
        rows.append(
            {
                "id": part,
                "observedOn": OBSERVED_ON,
                "source": "Apple Reacondicionado",
                "channel": "refurbished-buy",
                "url": url,
                "title": title,
                "family": family,
                "chip": chip_from(title),
                "cpuCores": cores(title, "CPU"),
                "gpuCores": cores(title, "GPU"),
                "year": int(dims["dimensionRelYear"]) if dims.get("dimensionRelYear") else None,
                "screenInches": parse_size(dims.get("dimensionScreensize")),
                "ramGB": parse_gb(dims.get("tsMemorySize")),
                "storageGB": parse_gb(dims.get("dimensionCapacity")),
                "color": dims.get("dimensionColor"),
                "priceEUR": float(tile["price"]["currentPrice"]["raw_amount"]),
                "currency": "EUR",
            }
        )
    rows.sort(key=lambda row: (row["family"], row["year"] or 0, row["ramGB"] or 0, row["storageGB"] or 0, row["priceEUR"]))
    return rows


def main() -> None:
    rows = observations_from(fetch_html())
    if len(rows) < 10:
        raise SystemExit(f"Solo {len(rows)} Macs en el escaparate: no se sustituye el dataset.")
    payload = {
        "observedOn": OBSERVED_ON,
        "region": "ES",
        "currency": "EUR",
        "source": "https://www.apple.com/es/shop/refurbished/mac",
        "note": f"Precios públicos de Apple Reacondicionado en España ({OBSERVED_ON}). El color no cambia el precio: el mismo equipo en otro acabado sale igual.",
        "count": len(rows),
        "observations": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} observations -> {OUT}")


if __name__ == "__main__":
    main()
