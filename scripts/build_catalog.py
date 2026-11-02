#!/usr/bin/env python3
"""Build src/data/catalog.json from the hello. 9.4.8 CSVs plus sourced Apple Silicon models.

Intel rows keep the original Spanish price column (the value ValoraResultado
depreciates). Apple Silicon and the Intel models missing from that dataset are
listed with Spain launch prices and a source note. Nothing here is a guessed
model name: every post-2019 machine is one Apple actually shipped or, for the
6 Nov 2026 wave, announced with a Spain price.
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "data" / "hello-csv"
OUT = ROOT / "src" / "data" / "catalog.json"

FILES = {
    "MacbookPro13APP.csv": ("macbook-pro", "MacBook Pro", "13″", 13.3, "portable"),
    "MacbookPro15APP.csv": ("macbook-pro", "MacBook Pro", "15″", 15.4, "portable"),
    "MacbookPro17APP.csv": ("macbook-pro", "MacBook Pro", "17″", 17.0, "portable"),
    "MacbookAir11APP.csv": ("macbook-air", "MacBook Air", "11″", 11.6, "portable"),
    "MacbookAir13APP.csv": ("macbook-air", "MacBook Air", "13″", 13.3, "portable"),
    "macbookPrice.csv": ("macbook", "MacBook", "12″", 12.0, "portable"),
    "MacMiniAPP.csv": ("mac-mini", "Mac mini", "—", 0, "desktop"),
    "imac21APP.csv": ("imac", "iMac", "21,5″", 21.5, "desktop"),
    "imac27APP.csv": ("imac", "iMac", "27″", 27.0, "desktop"),
    "imac20APP.csv": ("imac", "iMac", "20″", 20.0, "desktop"),
    "imac24APP.csv": ("imac", "iMac", "24″", 24.0, "desktop"),
    "macProAPP.csv": ("mac-pro", "Mac Pro", "—", 0, "desktop"),
}

FORMULA = {
    "macbook-pro": "macbook-pro",
    "macbook-air": "macbook-air",
    "macbook": "macbook-b",
    "mac-mini": "mac-mini",
    "imac": "imac-21",
    "mac-pro": "identity",
}


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text[:90] or "mac"


def norm_header(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", value).strip().lower()


def parse_number(cell: str | None) -> float | None:
    if cell is None:
        return None
    text = cell.strip().replace("€", "").replace(" ", "")
    if text.upper() in {"", "N/A", "NA", "-"}:
        return None
    text = text.replace(".", "").replace(",", ".") if text.count(",") == 1 and text.count(".") > 1 else text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def parse_gb_label(label: str) -> float | None:
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(tb|gb|gb)?", label.lower().replace(" ", ""))
    if not match:
        match = re.search(r"(\d+(?:[.,]\d+)?)\s*(tb|gb)", label.lower())
    if not match:
        return None
    number = float(match.group(1).replace(",", "."))
    unit = match.group(2) or ""
    if unit == "tb":
        return number * 1024
    return number


def parse_storage_label(label: str) -> dict | None:
    raw = (label or "").strip()
    if raw.upper() in {"", "N/A", "NA"}:
        return None
    low = raw.lower()
    if low in {"si", "sí"}:
        return {"gb": None, "kind": "hdd", "label": "HDD"}
    kind = "fusion" if "fusion" in low else "hdd" if "hdd" in low else "ssd"
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(tb|gb)", low)
    if not match:
        return None
    number = float(match.group(1).replace(",", "."))
    gb = int(round(number * 1024)) if match.group(2) == "tb" else int(round(number))
    pretty = raw.replace("SDD", "SSD")
    return {"gb": gb, "kind": kind, "label": pretty}


def find_col(headers: list[str], *needles: str, reject: tuple[str, ...] = ()) -> int | None:
    for index, header in enumerate(headers):
        if all(needle in header for needle in needles) and not any(item in header for item in reject):
            return index
    return None


def yes(value: str | None) -> bool:
    return (value or "").strip().lower() in {"y", "si", "sí", "yes"}


def infer_usb(family: str, year: int) -> bool:
    if family == "macbook":
        return year >= 2015
    if family == "macbook-air":
        return year >= 2018
    if family == "macbook-pro":
        return year >= 2016
    if family == "mac-mini":
        return year >= 2018
    if family == "imac":
        return year >= 2017
    if family == "mac-pro":
        return year >= 2019
    return family in {"mac-studio", "macbook-neo"}


def infer_ports(family: str, year: int, inches: float, generation: str) -> str:
    gen = generation.lower()
    if family in {"mac-mini", "mac-studio", "mac-pro", "imac"}:
        return "many"
    if family == "macbook-pro" and inches >= 16:
        return "many"
    if family == "macbook-pro" and year >= 2021 and inches >= 14:
        return "many"
    if family == "macbook-pro" and year < 2016:
        return "many"
    if family == "macbook-air" and year < 2018:
        return "many"
    if family == "macbook" and year < 2015:
        return "many"
    if "touch bar" in gen and inches >= 16:
        return "many"
    return "few"


def infer_uhd(family: str, year: int, generation: str, inches: float) -> bool:
    gen = generation.lower()
    if any(token in gen for token in ("4k", "5k", "retina", "xdr", "uhd")):
        return True
    if family == "macbook" and year >= 2015:
        return True
    if family == "macbook-air" and year >= 2018:
        return True
    if family == "macbook-pro" and ("retina" in gen or year >= 2016):
        return True
    if family == "macbook-pro" and year == 2012 and "retina" in gen:
        return True
    if family == "imac" and ("4k" in gen or "5k" in gen):
        return True
    if family in {"macbook-neo", "mac-studio"}:
        return True
    return False


def infer_weight(family: str, inches: float) -> str:
    if family in {"macbook-neo", "macbook"}:
        return "light"
    if family == "macbook-air":
        return "light" if inches <= 13.6 else "standard"
    if family == "macbook-pro":
        return "heavy" if inches >= 15 else "standard"
    if family == "mac-mini":
        return "light"
    return "heavy"


def drives_uhd(family: str, year: int, built_in: bool) -> bool:
    if built_in:
        return True
    if family in {"mac-mini", "mac-studio", "mac-pro"} and year >= 2012:
        return True
    if family == "imac" and year >= 2012:
        return True
    return False


def load_csv(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    rows = list(csv.reader(text.splitlines(), delimiter=";"))
    return [row for row in rows if any(cell.strip() for cell in row)]


def from_hello_csv() -> list[dict]:
    items: list[dict] = []
    for filename, (family, name, size, inches, form) in FILES.items():
        rows = load_csv(CSV_DIR / filename)
        headers = [norm_header(cell) for cell in rows[0]]
        price_idx = find_col(headers, "precio", reject=("nuevo",))
        if price_idx is None:
            price_idx = 6
        launch_idx = find_col(headers, "precio", "nuevo")
        ram_idx = find_col(headers, "ram", "fabrica") or 7
        extra_ram_idx = find_col(headers, "extra", "ram") or 29
        ssd_idx = find_col(headers, "ssd", "original") or 33
        extra_ssd_idx = find_col(headers, "extra", "ssd") or 43
        actual_idx = find_col(headers, "actualizable")
        formula_idx = find_col(headers, "formula")
        month_idx = find_col(headers, "mes") or 1
        year_idx = find_col(headers, "ano") or 2
        cpu_idx = find_col(headers, "procesador") or 3
        gpu_idx = find_col(headers, "grafica")

        ram_cols = []
        for index in range(ram_idx + 1, extra_ram_idx):
            gb = parse_gb_label(headers[index])
            if gb is not None and "ram" in headers[index]:
                ram_cols.append((index, gb, rows[0][index].strip()))

        storage_cols = []
        for index in range(ssd_idx + 1, extra_ssd_idx):
            parsed = parse_storage_label(rows[0][index])
            if parsed:
                storage_cols.append((index, parsed))

        for row_number, row in enumerate(rows[1:], start=1):
            if len(row) < 8 or not row[0].strip():
                continue
            generation = re.sub(r"\*\*New\*\*\s*", "", row[0]).strip()
            cpu = row[cpu_idx].strip() if cpu_idx < len(row) else ""
            if not cpu:
                continue
            base = parse_number(row[price_idx] if price_idx < len(row) else "")
            if base is None:
                continue
            launch = parse_number(row[launch_idx]) if launch_idx is not None and launch_idx < len(row) else None
            month = int(parse_number(row[month_idx]) or 1)
            year = int(parse_number(row[year_idx]) or 2006)
            factory_ram = parse_gb_label(row[ram_idx]) if ram_idx < len(row) else None
            if factory_ram is None:
                continue
            ram_options = [{"gb": factory_ram, "priceEUR": 0}]
            seen_ram = {factory_ram}
            for index, gb, _label in ram_cols:
                if index >= len(row):
                    continue
                price = parse_number(row[index])
                if price is None or gb in seen_ram:
                    continue
                ram_options.append({"gb": gb, "priceEUR": int(round(price))})
                seen_ram.add(gb)

            factory_storage = parse_storage_label(row[ssd_idx]) if ssd_idx < len(row) else None
            hdd_idx = find_col(headers, "hdd", "original")
            hdd_cell = row[hdd_idx].strip() if hdd_idx is not None and hdd_idx < len(row) else ""
            storage_options = []
            if factory_storage:
                storage_options.append({**factory_storage, "priceEUR": 0})
            elif yes(hdd_cell) or hdd_cell.lower() in {"si", "sí"}:
                storage_options.append({"gb": None, "kind": "hdd", "label": "HDD", "priceEUR": 0})
            seen_storage = {(opt["kind"], opt["gb"]) for opt in storage_options}
            for index, parsed in storage_cols:
                if index >= len(row):
                    continue
                price = parse_number(row[index])
                key = (parsed["kind"], parsed["gb"])
                if price is None or key in seen_storage:
                    continue
                storage_options.append({**parsed, "priceEUR": int(round(price))})
                seen_storage.add(key)
            if not storage_options:
                storage_options.append({"gb": None, "kind": "hdd", "label": "HDD", "priceEUR": 0})

            item_size = size
            item_inches = inches
            if family == "macbook" and year < 2015:
                item_size = "13″"
                item_inches = 13.3

            formula = FORMULA[family]
            if family == "imac" and item_inches >= 27:
                formula = "imac-27"
            if family == "imac" and item_inches in {20, 24} and year <= 2009:
                formula = "identity"
            if family == "macbook" and formula_idx is not None and formula_idx < len(row):
                formula = "macbook-a" if row[formula_idx].strip().upper() == "A" else "macbook-b"

            price_basis = "used-snapshot" if formula == "identity" else "launch"
            if price_basis == "launch" and launch is None:
                launch = int(round(base))
            built_in = infer_uhd(family, year, generation, item_inches)
            primary = storage_options[0]
            gpu = row[gpu_idx].strip() if gpu_idx is not None and gpu_idx < len(row) else ""
            if gpu.upper() in {"", "N/A", "NA"}:
                gpu = None
            item_id = slug(f"{family}-{year}-{generation}-{cpu}-{row_number}")
            items.append(
                {
                    "id": item_id,
                    "family": family,
                    "formFactor": form,
                    "name": name,
                    "sizeLabel": item_size,
                    "screenInches": item_inches,
                    "generation": generation,
                    "year": year,
                    "month": month,
                    "cpu": re.sub(r"\s+", " ", cpu),
                    "chip": chip_from_cpu(cpu),
                    "gpu": gpu,
                    "identifier": None,
                    "modelNumber": None,
                    "ramGB": factory_ram,
                    "ramOptions": ram_options,
                    "storageKind": primary["kind"],
                    "storageGB": primary["gb"],
                    "storageLabel": primary["label"],
                    "storageOptions": storage_options,
                    "launchPriceEUR": None if launch is None else int(round(launch)),
                    "basePriceEUR": int(round(base)),
                    "priceBasis": price_basis,
                    "priceConfidence": "dataset",
                    "priceSource": "hello. 9.4.8 (thedotapps). Columna de precio que usa ValoraResultado, en EUR.",
                    "extraRamFinal": yes(row[extra_ram_idx]) if extra_ram_idx < len(row) else False,
                    "extraStorageFinal": yes(row[extra_ssd_idx]) if extra_ssd_idx < len(row) else False,
                    "formula": formula,
                    "upgradable": yes(row[actual_idx]) if actual_idx is not None and actual_idx < len(row) else False,
                    "ports": infer_ports(family, year, item_inches, generation),
                    "usbC": infer_usb(family, year),
                    "builtInUhd": built_in if item_inches else False,
                    "drivesUhd": drives_uhd(family, year, built_in),
                    "weight": infer_weight(family, item_inches),
                    "availability": "discontinued",
                    "colors": [],
                    "capMode": "legacy",
                }
            )
    return items


def chip_from_cpu(cpu: str) -> str:
    low = cpu.lower()
    for token in ("m3", "i9", "i7", "i5", "i3", "xeon", "core 2", "core duo", "core solo"):
        if token in low:
            return token.upper() if token.startswith("i") or token == "m3" else token.title()
    if low.startswith("m ") or low.startswith("m ("):
        return "Intel Core M"
    return cpu.split("(")[0].strip() or cpu


def opt(gb: float, price: int) -> dict:
    return {"gb": gb, "priceEUR": price}


def ssd(gb: int, price: int) -> dict:
    label = f"{gb // 1024} TB SSD" if gb >= 1024 and gb % 1024 == 0 else f"{gb} GB SSD"
    return {"gb": gb, "kind": "ssd", "label": label, "priceEUR": price}


def model(
    *,
    id: str,
    family: str,
    name: str,
    size: str,
    inches: float,
    generation: str,
    year: int,
    month: int,
    cpu: str,
    chip: str,
    ram: float,
    storage: int,
    price: int | None,
    formula: str,
    availability: str,
    ports: str,
    usb: bool,
    uhd: bool,
    weight: str,
    source: str,
    confidence: str = "alta",
    form: str | None = None,
    ram_options: list[dict] | None = None,
    storage_options: list[dict] | None = None,
    identifier: str | None = None,
    model_number: str | None = None,
    colors: list[str] | None = None,
    gpu: str | None = None,
) -> dict:
    form_factor = form or ("portable" if family not in {"mac-mini", "imac", "mac-studio", "mac-pro"} else "desktop")
    built_in = bool(uhd and inches)
    return {
        "id": id,
        "family": family,
        "formFactor": form_factor,
        "name": name,
        "sizeLabel": size,
        "screenInches": inches,
        "generation": generation,
        "year": year,
        "month": month,
        "cpu": cpu,
        "chip": chip,
        "gpu": gpu,
        "identifier": identifier,
        "modelNumber": model_number,
        "ramGB": ram,
        "ramOptions": ram_options or [opt(ram, 0)],
        "storageKind": "ssd",
        "storageGB": storage,
        "storageLabel": ssd(storage, 0)["label"],
        "storageOptions": storage_options or [ssd(storage, 0)],
        "launchPriceEUR": price,
        "basePriceEUR": price,
        "priceBasis": "launch",
        "priceConfidence": confidence,
        "priceSource": source,
        "extraRamFinal": False,
        "extraStorageFinal": False,
        "formula": formula,
        "upgradable": False,
        "ports": ports,
        "usbC": usb,
        "builtInUhd": built_in,
        "drivesUhd": True,
        "weight": weight,
        "availability": availability,
        "colors": colors or [],
        "capMode": "configured",
    }


def supplemental() -> list[dict]:
    """Models absent from hello. 9.4.8, with Spain EUR launch prices where sourced."""
    apple = "Nota de prensa de Apple España"
    every = "EveryMac, PVP original en España (consultado 2026)"
    press = "Prensa tecnológica española con el PVP de Apple Store"
    eusk = "Euskonnection, PVP de salida en España contrastado con notas de Apple (confianza alta)"
    items = [
        model(
            id="mba-13-intel-2020",
            family="macbook-air",
            name="MacBook Air",
            size="13″",
            inches=13.3,
            generation="Early 2020",
            year=2020,
            month=3,
            cpu="Intel Core i3 de 2 núcleos (1,1 GHz)",
            chip="Intel Core i3",
            ram=8,
            storage=256,
            price=1199,
            formula="macbook-air",
            availability="discontinued",
            ports="many",
            usb=True,
            uhd=True,
            weight="light",
            source="PVP de entrada del MacBook Air Intel 2020 en España. La configuración i7 se comparó en 1.329 € (Applesfera, tabla de bajada M1). Confianza media.",
            confidence="media",
            identifier="MacBookAir9,1",
            model_number="A2179",
            colors=["Oro", "Plata", "Gris espacial"],
            ram_options=[opt(8, 0), opt(16, 230)],
            storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)],
        ),
        model(
            id="mbp-13-2020-2ports",
            family="macbook-pro",
            name="MacBook Pro",
            size="13″",
            inches=13.3,
            generation="Mid 2020",
            year=2020,
            month=5,
            cpu="Intel Core i5 de 4 núcleos (1,4 GHz)",
            chip="Intel Core i5",
            ram=8,
            storage=256,
            price=1499,
            formula="macbook-pro",
            availability="discontinued",
            ports="few",
            usb=True,
            uhd=True,
            weight="standard",
            source="PVP de entrada del MacBook Pro 13\" de dos puertos (mayo 2020) en España. Confianza media.",
            confidence="media",
            identifier="MacBookPro16,3",
            model_number="A2289",
            ram_options=[opt(8, 0), opt(16, 230)],
            storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)],
        ),
        model(
            id="mbp-13-2020-4ports",
            family="macbook-pro",
            name="MacBook Pro",
            size="13″",
            inches=13.3,
            generation="Mid 2020 cuatro puertos",
            year=2020,
            month=5,
            cpu="Intel Core i5 de 4 núcleos (2,0 GHz)",
            chip="Intel Core i5",
            ram=16,
            storage=512,
            price=2199,
            formula="macbook-pro",
            availability="discontinued",
            ports="few",
            usb=True,
            uhd=True,
            weight="standard",
            source="PVP de entrada del MacBook Pro 13\" de cuatro puertos Thunderbolt (mayo 2020) en España. Confianza media.",
            confidence="media",
            identifier="MacBookPro16,2",
            model_number="A2251",
            ram_options=[opt(16, 0), opt(32, 460)],
            storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380)],
        ),
        model(
            id="mbp-16-2019-i7",
            family="macbook-pro",
            name="MacBook Pro",
            size="16″",
            inches=16.0,
            generation="Late 2019",
            year=2019,
            month=11,
            cpu="Intel Core i7 de 6 núcleos (2,6 GHz)",
            chip="Intel Core i7",
            ram=16,
            storage=512,
            price=2699,
            formula="macbook-pro",
            availability="discontinued",
            ports="many",
            usb=True,
            uhd=True,
            weight="heavy",
            source=eusk,
            identifier="MacBookPro16,1",
            model_number="A2141",
            colors=["Plata", "Gris espacial"],
            gpu="AMD Radeon Pro 5300M",
            ram_options=[opt(16, 0), opt(32, 460), opt(64, 920)],
            storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)],
        ),
        model(
            id="imac-27-2020",
            family="imac",
            name="iMac",
            size="27″",
            inches=27.0,
            generation="Mid 2020 5K",
            year=2020,
            month=8,
            cpu="Intel Core i5 de 6 núcleos (3,1 GHz)",
            chip="Intel Core i5",
            ram=8,
            storage=256,
            price=1999,
            formula="imac-27",
            availability="discontinued",
            ports="many",
            usb=True,
            uhd=True,
            weight="heavy",
            source="PVP de entrada del iMac 27\" 5K de 2020 en España. Confianza media.",
            confidence="media",
            identifier="iMac20,1",
            model_number="A2115",
            gpu="AMD Radeon Pro 5300",
            ram_options=[opt(8, 0), opt(16, 230), opt(32, 690), opt(64, 1150), opt(128, 2760)],
            storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)],
        ),
        model(
            id="imac-pro-2017",
            family="imac",
            name="iMac Pro",
            size="27″",
            inches=27.0,
            generation="Late 2017",
            year=2017,
            month=12,
            cpu="Intel Xeon W de 8 núcleos (3,2 GHz)",
            chip="Intel Xeon W",
            ram=32,
            storage=1024,
            price=5599,
            formula="imac-27",
            availability="discontinued",
            ports="many",
            usb=True,
            uhd=True,
            weight="heavy",
            source="PVP de entrada del iMac Pro (2017) en España. Confianza media.",
            confidence="media",
            identifier="iMacPro1,1",
            model_number="A1862",
            colors=["Gris espacial"],
            gpu="AMD Radeon Pro Vega 56",
            ram_options=[opt(32, 0), opt(64, 920), opt(128, 2760)],
            storage_options=[ssd(1024, 0), ssd(2048, 920), ssd(4096, 2760)],
        ),
        model(
            id="mac-pro-2019",
            family="mac-pro",
            name="Mac Pro",
            size="—",
            inches=0,
            generation="Late 2019",
            year=2019,
            month=12,
            cpu="Intel Xeon de 8 núcleos (3,5 GHz)",
            chip="Intel Xeon",
            ram=32,
            storage=256,
            price=6499,
            formula="macbook-pro",
            availability="discontinued",
            ports="many",
            usb=True,
            uhd=False,
            weight="heavy",
            source="PVP de entrada del Mac Pro torre (2019) en España. Confianza media. La curva usada es la del MacBook Pro: el Mac Pro antiguo de hello. no depreciaba porque su columna ya era un precio de segunda mano.",
            confidence="media",
            identifier="MacPro7,1",
            model_number="A1991",
            ram_options=[opt(32, 0), opt(48, 460), opt(96, 1380), opt(192, 3220), opt(384, 6900), opt(768, 13800), opt(1536, 27600)],
            storage_options=[ssd(256, 0), ssd(1024, 690), ssd(2048, 1150), ssd(4096, 2070)],
        ),
        # Apple Silicon — entry configuration of each shipped chip.
        model(id="mba-13-m1-2020", family="macbook-air", name="MacBook Air", size="13″", inches=13.3, generation="Finales de 2020", year=2020, month=11, cpu="M1 · 8 núcleos CPU / 7 núcleos GPU", chip="M1", ram=8, storage=256, price=1129, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="light", source=eusk + " El anuncio partió de 1.129 €; Applesfera documentó un ajuste previo desde 1.199 €.", identifier="MacBookAir10,1", model_number="A2337", colors=["Oro", "Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230)], storage_options=[ssd(256, 0), ssd(512, 270), ssd(1024, 540), ssd(2048, 1080)]),
        model(id="mba-13-m2-2022", family="macbook-air", name="MacBook Air", size="13″", inches=13.6, generation="Mediados de 2022", year=2022, month=7, cpu="M2 · 8 núcleos CPU / 8 núcleos GPU", chip="M2", ram=8, storage=256, price=1519, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="light", source=eusk, identifier="Mac14,2", model_number="A2681", colors=["Medianoche", "Luz de las estrellas", "Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-15-m2-2023", family="macbook-air", name="MacBook Air", size="15″", inches=15.3, generation="Mediados de 2023", year=2023, month=6, cpu="M2 · 8 núcleos CPU / 10 núcleos GPU", chip="M2", ram=8, storage=256, price=1599, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac14,15", model_number="A2941", colors=["Medianoche", "Luz de las estrellas", "Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-13-m3-2024", family="macbook-air", name="MacBook Air", size="13″", inches=13.6, generation="Principios de 2024", year=2024, month=3, cpu="M3 · 8 núcleos CPU / 8 núcleos GPU", chip="M3", ram=8, storage=256, price=1299, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="light", source=eusk, identifier="Mac15,12", model_number="A3113", colors=["Medianoche", "Luz de las estrellas", "Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-15-m3-2024", family="macbook-air", name="MacBook Air", size="15″", inches=15.3, generation="Principios de 2024", year=2024, month=3, cpu="M3 · 8 núcleos CPU / 10 núcleos GPU", chip="M3", ram=8, storage=256, price=1599, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac15,13", model_number="A3114", colors=["Medianoche", "Luz de las estrellas", "Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-13-m4-2025", family="macbook-air", name="MacBook Air", size="13″", inches=13.6, generation="Principios de 2025", year=2025, month=3, cpu="M4 · 10 núcleos CPU / 8 núcleos GPU", chip="M4", ram=16, storage=256, price=1199, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="light", source=eusk, identifier="Mac16,12", model_number="A3240", colors=["Azul cielo", "Medianoche", "Luz de las estrellas", "Plata"], ram_options=[opt(16, 0), opt(24, 230), opt(32, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-15-m4-2025", family="macbook-air", name="MacBook Air", size="15″", inches=15.3, generation="Principios de 2025", year=2025, month=3, cpu="M4 · 10 núcleos CPU / 10 núcleos GPU", chip="M4", ram=16, storage=256, price=1499, formula="macbook-air", availability="discontinued", ports="few", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac16,13", model_number="A3241", colors=["Azul cielo", "Medianoche", "Luz de las estrellas", "Plata"], ram_options=[opt(16, 0), opt(24, 230), opt(32, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mba-13-m5-2026", family="macbook-air", name="MacBook Air", size="13″", inches=13.6, generation="Principios de 2026", year=2026, month=3, cpu="M5 · 10 núcleos CPU / 8 núcleos GPU", chip="M5", ram=16, storage=512, price=1199, formula="macbook-air", availability="current", ports="few", usb=True, uhd=True, weight="light", source="Applesfera y MacGeneration, PVP de lanzamiento en España el 11 mar 2026 (antes de la subida de junio): 1.199 € con 16 GB y 512 GB. GPU de 10 núcleos +125 €.", identifier="Mac17,3", model_number="A3449", colors=["Azul cielo", "Medianoche", "Luz de las estrellas", "Plata"], ram_options=[opt(16, 0), opt(24, 250), opt(32, 500)], storage_options=[ssd(512, 0), ssd(1024, 250), ssd(2048, 750), ssd(4096, 1500)]),
        model(id="mba-15-m5-2026", family="macbook-air", name="MacBook Air", size="15″", inches=15.3, generation="Principios de 2026", year=2026, month=3, cpu="M5 · 10 núcleos CPU / 10 núcleos GPU", chip="M5", ram=16, storage=512, price=1499, formula="macbook-air", availability="current", ports="few", usb=True, uhd=True, weight="standard", source="Applesfera, MacGeneration y Marca: PVP de lanzamiento 1.499 € (11 mar 2026).", identifier="Mac17,4", model_number="A3448", colors=["Azul cielo", "Medianoche", "Luz de las estrellas", "Plata"], ram_options=[opt(16, 0), opt(24, 250), opt(32, 500)], storage_options=[ssd(512, 0), ssd(1024, 250), ssd(2048, 750), ssd(4096, 1500)]),
        model(id="mbp-13-m1-2020", family="macbook-pro", name="MacBook Pro", size="13″", inches=13.3, generation="Finales de 2020", year=2020, month=11, cpu="M1 · 8 núcleos CPU / 8 núcleos GPU", chip="M1", ram=8, storage=256, price=1449, formula="macbook-pro", availability="discontinued", ports="few", usb=True, uhd=True, weight="standard", source=eusk, identifier="MacBookPro17,1", model_number="A2338", colors=["Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mbp-13-m2-2022", family="macbook-pro", name="MacBook Pro", size="13″", inches=13.3, generation="Mediados de 2022", year=2022, month=6, cpu="M2 · 8 núcleos CPU / 10 núcleos GPU", chip="M2", ram=8, storage=256, price=1619, formula="macbook-pro", availability="discontinued", ports="few", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac14,7", model_number="A2338", colors=["Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mbp-14-m1pro-2021", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2021", year=2021, month=10, cpu="M1 Pro · 8 núcleos CPU / 14 núcleos GPU", chip="M1 Pro", ram=16, storage=512, price=2249, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source=eusk, identifier="MacBookPro18,3", model_number="A2442", colors=["Plata", "Gris espacial"], ram_options=[opt(16, 0), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mbp-14-m1max-2021", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2021", year=2021, month=10, cpu="M1 Max · 10 núcleos CPU / 24 núcleos GPU", chip="M1 Max", ram=32, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="Especificaciones de la configuración de entrada con M1 Max (Apple, oct 2021). El PVP de España de esta configuración no quedó contrastado en las fuentes usadas; no se inventa.", confidence="media", identifier="MacBookPro18,4", model_number="A2442", colors=["Plata", "Gris espacial"]),
        model(id="mbp-16-m1pro-2021", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2021", year=2021, month=10, cpu="M1 Pro · 10 núcleos CPU / 16 núcleos GPU", chip="M1 Pro", ram=16, storage=512, price=2749, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source=eusk, identifier="MacBookPro18,1", model_number="A2485", colors=["Plata", "Gris espacial"], ram_options=[opt(16, 0), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mbp-16-m1max-2021", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2021", year=2021, month=10, cpu="M1 Max · 10 núcleos CPU / 24 núcleos GPU", chip="M1 Max", ram=32, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="Configuración de entrada M1 Max de 16\" (Apple, oct 2021). PVP España no contrastado.", confidence="media", identifier="MacBookPro18,2", model_number="A2485", colors=["Plata", "Gris espacial"]),
        model(id="mbp-14-m2pro-2023", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2023", year=2023, month=1, cpu="M2 Pro · 10 núcleos CPU / 16 núcleos GPU", chip="M2 Pro", ram=16, storage=512, price=2499, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac14,9", model_number="A2779", colors=["Plata", "Gris espacial"], ram_options=[opt(16, 0), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mbp-14-m2max-2023", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2023", year=2023, month=1, cpu="M2 Max · 12 núcleos CPU / 30 núcleos GPU", chip="M2 Max", ram=32, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="Configuración de entrada M2 Max de 14\" (Apple, ene 2023). PVP España no contrastado.", confidence="media", identifier="Mac14,5", model_number="A2779", colors=["Plata", "Gris espacial"]),
        model(id="mbp-16-m2pro-2023", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Principios de 2023", year=2023, month=1, cpu="M2 Pro · 12 núcleos CPU / 19 núcleos GPU", chip="M2 Pro", ram=16, storage=512, price=3049, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source=eusk, identifier="Mac14,10", model_number="A2780", colors=["Plata", "Gris espacial"], ram_options=[opt(16, 0), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mbp-16-m2max-2023", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Principios de 2023", year=2023, month=1, cpu="M2 Max · 12 núcleos CPU / 30 núcleos GPU", chip="M2 Max", ram=32, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="Configuración de entrada M2 Max de 16\" (Apple, ene 2023). PVP España no contrastado.", confidence="media", identifier="Mac14,6", model_number="A2780", colors=["Plata", "Gris espacial"]),
        model(id="mbp-14-m3-2023", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2023", year=2023, month=10, cpu="M3 · 8 núcleos CPU / 10 núcleos GPU", chip="M3", ram=8, storage=512, price=2029, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source=eusk, identifier="Mac15,3", model_number="A2918", colors=["Plata", "Gris espacial"], ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690)]),
        model(id="mbp-14-m3pro-2023", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2023", year=2023, month=10, cpu="M3 Pro · 11 núcleos CPU / 14 núcleos GPU", chip="M3 Pro", ram=18, storage=512, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="Configuración de entrada M3 Pro de 14\" (Apple, 30 oct 2023): 11/14 núcleos, 18 GB, 512 GB. PVP España no contrastado.", confidence="media", identifier="Mac15,6", model_number="A2992", colors=["Negro espacial", "Plata"]),
        model(id="mbp-14-m3max-2023", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2023", year=2023, month=10, cpu="M3 Max · 14 núcleos CPU / 30 núcleos GPU", chip="M3 Max", ram=36, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="Configuración de entrada M3 Max de 14\" (Apple, oct 2023). PVP España no contrastado.", confidence="media", identifier="Mac15,8", model_number="A2992", colors=["Negro espacial", "Plata"]),
        model(id="mbp-16-m3pro-2023", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2023", year=2023, month=10, cpu="M3 Pro · 12 núcleos CPU / 18 núcleos GPU", chip="M3 Pro", ram=18, storage=512, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="Configuración de entrada M3 Pro de 16\" (Apple, oct 2023): 12/18 núcleos, 18 GB, 512 GB. PVP España no contrastado.", confidence="media", identifier="Mac15,7", model_number="A2991", colors=["Negro espacial", "Plata"]),
        model(id="mbp-16-m3max-2023", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2023", year=2023, month=10, cpu="M3 Max · 14 núcleos CPU / 30 núcleos GPU", chip="M3 Max", ram=36, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="Configuración de entrada M3 Max de 16\" (Apple, oct 2023). PVP España no contrastado.", confidence="media", identifier="Mac15,9", model_number="A2991", colors=["Negro espacial", "Plata"]),
        model(id="mbp-14-m4-2024", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2024", year=2024, month=10, cpu="M4 · 10 núcleos CPU / 10 núcleos GPU", chip="M4", ram=16, storage=512, price=1929, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="20minutos, PVP España de lanzamiento (nov 2024): desde 1.929 €.", identifier="Mac16,1", model_number="A3112", colors=["Negro espacial", "Plata"], ram_options=[opt(16, 0), opt(24, 230), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690)]),
        model(id="mbp-14-m4pro-2024", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2024", year=2024, month=10, cpu="M4 Pro · 12 núcleos CPU / 16 núcleos GPU", chip="M4 Pro", ram=24, storage=512, price=2449, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="20minutos, PVP España de lanzamiento: desde 2.449 €.", identifier="Mac16,8", model_number="A3401", colors=["Negro espacial", "Plata"], ram_options=[opt(24, 0), opt(48, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380)]),
        model(id="mbp-14-m4max-2024", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2024", year=2024, month=10, cpu="M4 Max · 14 núcleos CPU / 32 núcleos GPU", chip="M4 Max", ram=36, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="standard", source="Configuración de entrada M4 Max de 14\" (Apple, oct 2024). PVP España no contrastado.", confidence="media", identifier="Mac16,5", model_number="A3185", colors=["Negro espacial", "Plata"]),
        model(id="mbp-16-m4pro-2024", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2024", year=2024, month=10, cpu="M4 Pro · 14 núcleos CPU / 20 núcleos GPU", chip="M4 Pro", ram=24, storage=512, price=2949, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="20minutos: el MacBook Pro de 16 pulgadas de esta generación desde 2.949 €.", identifier="Mac16,7", model_number="A3403", colors=["Negro espacial", "Plata"], ram_options=[opt(24, 0), opt(48, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380)]),
        model(id="mbp-16-m4max-2024", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2024", year=2024, month=10, cpu="M4 Max · 14 núcleos CPU / 32 núcleos GPU", chip="M4 Max", ram=36, storage=1024, price=None, formula="macbook-pro", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="Configuración de entrada M4 Max de 16\" (Apple, oct 2024). PVP España no contrastado.", confidence="media", identifier="Mac16,6", model_number="A3186", colors=["Negro espacial", "Plata"]),
        model(id="mbp-14-m5-2025", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2025", year=2025, month=10, cpu="M5 · 10 núcleos CPU / 10 núcleos GPU", chip="M5", ram=16, storage=512, price=1829, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="standard", source="Euskonnection y cobertura del anuncio: PVP de salida 1.829 € (oct 2025). En marzo de 2026 Apple pasó el almacenamiento de serie a 1 TB.", identifier="Mac17,2", model_number="A3434", colors=["Negro espacial", "Plata"], ram_options=[opt(16, 0), opt(24, 250), opt(32, 500)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380)]),
        model(id="mbp-14-m5pro-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Pro · 15 núcleos CPU / 16 núcleos GPU", chip="M5 Pro", ram=24, storage=1024, price=2549, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="standard", source="Applesfera y Marca, PVP de lanzamiento 11 mar 2026: desde 2.549 € (24 GB, 1 TB).", identifier="Mac17,7", model_number="A3426", colors=["Negro espacial", "Plata"], ram_options=[opt(24, 0), opt(48, 500), opt(64, 750)], storage_options=[ssd(1024, 0), ssd(2048, 500), ssd(4096, 1250)]),
        model(id="mbp-14-m5pro-18-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Pro · 18 núcleos CPU / 20 núcleos GPU", chip="M5 Pro", ram=24, storage=1024, price=2749, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="standard", source="Applesfera, marzo 2026: el M5 Pro de 18/20 núcleos suma 200 € sobre los 2.549 €.", identifier="Mac17,9", model_number="A3427", colors=["Negro espacial", "Plata"], ram_options=[opt(24, 0), opt(48, 500), opt(64, 750)], storage_options=[ssd(1024, 0), ssd(2048, 500), ssd(4096, 1250)]),
        model(id="mbp-14-m5max-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Max · 18 núcleos CPU / 32 núcleos GPU", chip="M5 Max", ram=36, storage=2048, price=4249, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="standard", source="Applesfera, PVP de lanzamiento marzo 2026: desde 4.249 € (36 GB, 2 TB).", identifier="Mac17,9", model_number="A3427", colors=["Negro espacial", "Plata"], storage_options=[ssd(2048, 0), ssd(4096, 750), ssd(8192, 2250)]),
        model(id="mbp-14-m5max-40-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Max · 18 núcleos CPU / 40 núcleos GPU", chip="M5 Max", ram=48, storage=2048, price=4874, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="standard", source="Applesfera, marzo 2026: M5 Max 40 núcleos GPU y 48 GB desde 4.874 €.", identifier="Mac17,9", model_number="A3427", colors=["Negro espacial", "Plata"], ram_options=[opt(48, 0), opt(64, 250), opt(128, 1250)], storage_options=[ssd(2048, 0), ssd(4096, 750), ssd(8192, 2250)]),
        model(id="mbp-16-m5pro-2026", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Pro · 18 núcleos CPU / 20 núcleos GPU", chip="M5 Pro", ram=24, storage=1024, price=3049, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="heavy", source="Applesfera, PVP de lanzamiento marzo 2026: 16\" M5 Pro desde 3.049 €.", identifier="Mac17,6", model_number="A3428", colors=["Negro espacial", "Plata"], ram_options=[opt(24, 0), opt(48, 500), opt(64, 750)], storage_options=[ssd(1024, 0), ssd(2048, 500), ssd(4096, 1250)]),
        model(id="mbp-16-m5max-2026", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Principios de 2026", year=2026, month=3, cpu="M5 Max · 18 núcleos CPU / 32 núcleos GPU", chip="M5 Max", ram=36, storage=2048, price=4549, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=True, weight="heavy", source="Marca, precios europeos del 3 mar 2026: 16\" M5 Max desde 4.549 €. Coincide con la nota de Apple (desde 3.899 $ en EE. UU.).", identifier="Mac17,8", model_number="A3429", colors=["Negro espacial", "Plata"], storage_options=[ssd(2048, 0), ssd(4096, 750), ssd(8192, 2250)]),
        model(id="mbp-14-m6-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2026", year=2026, month=11, cpu="M6 · 12 núcleos CPU / 12 núcleos GPU", chip="M6", ram=16, storage=1024, price=2329, formula="macbook-pro", availability="preorder", ports="many", usb=True, uhd=True, weight="standard", source=apple + ": desde 2.329 €. Reserva el 28 oct 2026, a la venta el 6 nov 2026. 16 GB de serie y SSD desde 1 TB según la cobertura técnica del anuncio.", identifier="Mac18,1", model_number="A3536", colors=["Negro espacial", "Plata"], ram_options=[opt(16, 0), opt(24, 220), opt(32, 440)], storage_options=[ssd(1024, 0), ssd(2048, 550), ssd(4096, 1650)]),
        model(id="mbp-14-proled-m5pro-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2026 PROLED XDR", year=2026, month=11, cpu="M5 Pro · pantalla PROLED XDR táctil", chip="M5 Pro", ram=24, storage=1024, price=3349, formula="macbook-pro", availability="preorder", ports="many", usb=True, uhd=True, weight="standard", source="Apple anunció el MacBook Pro PROLED XDR el 28 oct 2026 (venta 6 nov). El PVP de España desde 3.349 € (14\", M5 Pro) procede de la cobertura especializada, no de la cifra en la nota de prensa. Confianza media.", confidence="media", identifier="Mac17,11", model_number="A3375", colors=["Negro espacial", "Plata"]),
        model(id="mbp-16-proled-m5pro-2026", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2026 PROLED XDR", year=2026, month=11, cpu="M5 Pro · pantalla PROLED XDR táctil", chip="M5 Pro", ram=24, storage=1024, price=3949, formula="macbook-pro", availability="preorder", ports="many", usb=True, uhd=True, weight="heavy", source="Cobertura del PROLED XDR en España: 16\" M5 Pro desde 3.949 €. Confianza media. Producto confirmado por Apple.", confidence="media", identifier="Mac17,10", model_number="A3376", colors=["Negro espacial", "Plata"]),
        model(id="mbp-14-proled-m5max-2026", family="macbook-pro", name="MacBook Pro", size="14″", inches=14.2, generation="Finales de 2026 PROLED XDR", year=2026, month=11, cpu="M5 Max · pantalla PROLED XDR táctil", chip="M5 Max", ram=36, storage=2048, price=5249, formula="macbook-pro", availability="preorder", ports="many", usb=True, uhd=True, weight="standard", source="Cobertura del PROLED XDR en España: 14\" M5 Max desde 5.249 €. Confianza media.", confidence="media", identifier="Mac17,13", model_number="A3468", colors=["Negro espacial", "Plata"]),
        model(id="mbp-16-proled-m5max-2026", family="macbook-pro", name="MacBook Pro", size="16″", inches=16.2, generation="Finales de 2026 PROLED XDR", year=2026, month=11, cpu="M5 Max · pantalla PROLED XDR táctil", chip="M5 Max", ram=36, storage=2048, price=5649, formula="macbook-pro", availability="preorder", ports="many", usb=True, uhd=True, weight="heavy", source="Cobertura del PROLED XDR en España: 16\" M5 Max desde 5.649 €. Confianza media.", confidence="media", identifier="Mac17,12", model_number="A3469", colors=["Negro espacial", "Plata"]),
        model(id="mbn-13-a18-2026", family="macbook-neo", name="MacBook Neo", size="13″", inches=13.0, generation="Principios de 2026", year=2026, month=3, cpu="A18 Pro · 6 núcleos CPU (2+4) / 5 núcleos GPU", chip="A18 Pro", ram=8, storage=256, price=699, formula="macbook-b", availability="current", ports="few", usb=True, uhd=True, weight="light", source=apple + " (4 mar 2026): desde 699 €. Pantalla Liquid Retina de 13\", 8 GB, SSD de 256 GB. Hubo una subida posterior; este es el precio de lanzamiento.", identifier=None, model_number=None, colors=["Rosa nube", "Índigo", "Plata", "Cítrico"], storage_options=[ssd(256, 0), ssd(512, 100)]),
        model(id="imac-24-m1-2021", family="imac", name="iMac", size="24″", inches=23.5, generation="Mediados de 2021", year=2021, month=4, cpu="M1 · 8 núcleos CPU / 7 núcleos GPU · 2 puertos", chip="M1", ram=8, storage=256, price=1449, formula="imac-21", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="PVP de entrada del iMac 24\" M1 en España (abr 2021). Confianza media: la cifra de 1.449 € es la publicada de forma reiterada para los dos puertos.", confidence="media", identifier="iMac21,2", model_number="A2439", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"], ram_options=[opt(8, 0), opt(16, 230)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460)]),
        model(id="imac-24-m1-4ports-2021", family="imac", name="iMac", size="24″", inches=23.5, generation="Mediados de 2021", year=2021, month=4, cpu="M1 · 8 núcleos CPU / 8 núcleos GPU · 4 puertos", chip="M1", ram=8, storage=256, price=1669, formula="imac-21", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="PVP de la configuración de cuatro puertos del iMac 24\" M1 en España. Confianza media.", confidence="media", identifier="iMac21,1", model_number="A2438", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"], ram_options=[opt(8, 0), opt(16, 230)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="imac-24-m3-2023", family="imac", name="iMac", size="24″", inches=23.5, generation="Finales de 2023", year=2023, month=10, cpu="M3 · 8 núcleos CPU / 8 núcleos GPU", chip="M3", ram=8, storage=256, price=None, formula="imac-21", availability="discontinued", ports="many", usb=True, uhd=True, weight="heavy", source="iMac 24\" M3 (Apple, 30 oct 2023), configuración de entrada 8/8, 8 GB, 256 GB. PVP España no contrastado.", confidence="media", identifier="Mac15,4", model_number="A2874", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"]),
        model(id="imac-24-m4-2024", family="imac", name="iMac", size="24″", inches=23.5, generation="Finales de 2024", year=2024, month=10, cpu="M4 · 8 núcleos CPU / 8 núcleos GPU", chip="M4", ram=16, storage=256, price=1519, formula="imac-21", availability="current", ports="many", usb=True, uhd=True, weight="heavy", source="Applesfera (mar 2026), PVP España de 1.519 € con M4 de 8/8, 16 GB y 256 GB, anterior a la subida de junio de 2026.", identifier="Mac16,2", model_number="A3247", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"], ram_options=[opt(16, 0), opt(24, 230), opt(32, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="imac-24-m6-2026", family="imac", name="iMac", size="24″", inches=23.5, generation="Finales de 2026", year=2026, month=11, cpu="M6 · 10 núcleos CPU / 10 núcleos GPU", chip="M6", ram=16, storage=256, price=1819, formula="imac-21", availability="preorder", ports="many", usb=True, uhd=True, weight="heavy", source=apple + ": desde 1.819 € (CPU/GPU de 10 núcleos). Venta el 6 nov 2026. La nota no detalla GB de serie; se usa la entrada del iMac M4 al que sustituye (16 GB / 256 GB).", identifier="Mac18,2", model_number="A3589", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"]),
        model(id="imac-24-m6-12-2026", family="imac", name="iMac", size="24″", inches=23.5, generation="Finales de 2026", year=2026, month=11, cpu="M6 · 12 núcleos CPU / 12 núcleos GPU", chip="M6", ram=16, storage=256, price=2019, formula="imac-21", availability="preorder", ports="many", usb=True, uhd=True, weight="heavy", source=apple + ": desde 2.019 € con CPU y GPU de 12 núcleos.", identifier="Mac18,2", model_number="A3590", colors=["Azul", "Verde", "Rosa", "Plata", "Amarillo", "Naranja", "Morado"]),
        model(id="mini-m1-2020", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2020", year=2020, month=11, cpu="M1 · 8 núcleos CPU / 8 núcleos GPU", chip="M1", ram=8, storage=256, price=799, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="light", source="PVP España tras el ajuste documentado por Applesfera (929 € → 799 €) para 8 GB / 256 GB. Confianza alta en 799 € como precio de referencia de la generación.", identifier="Macmini9,1", model_number="A2348", ram_options=[opt(8, 0), opt(16, 230)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mini-m2-2023", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Principios de 2023", year=2023, month=1, cpu="M2 · 8 núcleos CPU / 10 núcleos GPU", chip="M2", ram=8, storage=256, price=719, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="light", source="PVP de entrada del Mac mini M2 en España (ene 2023). Confianza media.", confidence="media", identifier="Mac14,3", model_number="A2686", ram_options=[opt(8, 0), opt(16, 230), opt(24, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mini-m2pro-2023", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Principios de 2023", year=2023, month=1, cpu="M2 Pro · 10 núcleos CPU / 16 núcleos GPU", chip="M2 Pro", ram=16, storage=512, price=1549, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="light", source="PVP de entrada del Mac mini M2 Pro en España (ene 2023). Confianza media.", confidence="media", identifier="Mac14,12", model_number="A2816", ram_options=[opt(16, 0), opt(32, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mini-m4-2024", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2024", year=2024, month=10, cpu="M4 · 10 núcleos CPU / 10 núcleos GPU", chip="M4", ram=16, storage=256, price=719, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="light", source="20minutos: Mac mini M4 desde 719 € (nov 2024).", identifier="Mac16,10", model_number="A3238", ram_options=[opt(16, 0), opt(24, 230), opt(32, 460)], storage_options=[ssd(256, 0), ssd(512, 230), ssd(1024, 460), ssd(2048, 920)]),
        model(id="mini-m4pro-2024", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2024", year=2024, month=10, cpu="M4 Pro · 12 núcleos CPU / 16 núcleos GPU", chip="M4 Pro", ram=24, storage=512, price=1669, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="light", source="20minutos: Mac mini M4 Pro desde 1.669 €.", identifier="Mac16,11", model_number="A3239", ram_options=[opt(24, 0), opt(48, 460), opt(64, 690)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="mini-m6-2026", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M6 · 12 núcleos CPU / 12 núcleos GPU", chip="M6", ram=16, storage=256, price=1069, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="light", source="Applesfera, PVP de lanzamiento (a la venta el 22 sep 2026): desde 1.069 €, 16 GB y 256 GB.", identifier="Mac18,5", model_number="A3534", ram_options=[opt(16, 0), opt(24, 220), opt(48, 440)], storage_options=[ssd(256, 0), ssd(512, 220), ssd(1024, 550), ssd(2048, 1100)]),
        model(id="mini-m5pro-2026", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M5 Pro · 15 núcleos CPU / 16 núcleos GPU", chip="M5 Pro", ram=24, storage=512, price=2019, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="light", source="Applesfera, 22 sep 2026: M5 Pro 15/16 desde 2.019 € (24 GB, 512 GB).", identifier="Mac17,16", model_number="A3535", ram_options=[opt(24, 0), opt(48, 660), opt(64, 1100)], storage_options=[ssd(512, 0), ssd(1024, 330), ssd(2048, 880), ssd(4096, 1980), ssd(8192, 4180)]),
        model(id="mini-m5pro-18-2026", family="mac-mini", name="Mac mini", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M5 Pro · 18 núcleos CPU / 20 núcleos GPU", chip="M5 Pro", ram=24, storage=512, price=2239, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="light", source="Applesfera, 22 sep 2026: M5 Pro 18/20 desde 2.239 €.", identifier="Mac17,16", model_number="A3535", ram_options=[opt(24, 0), opt(48, 660), opt(64, 1100)], storage_options=[ssd(512, 0), ssd(1024, 330), ssd(2048, 880), ssd(4096, 1980), ssd(8192, 4180)]),
        model(id="studio-m1max-2022", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Principios de 2022", year=2022, month=3, cpu="M1 Max · 10 núcleos CPU / 24 núcleos GPU", chip="M1 Max", ram=32, storage=512, price=2329, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source=every + ". Curva del Mac mini: hello. no tenía Mac Studio.", identifier="Mac13,1", model_number="A2615", ram_options=[opt(32, 0), opt(64, 460)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="studio-m1ultra-2022", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Principios de 2022", year=2022, month=3, cpu="M1 Ultra · 20 núcleos CPU / 48 núcleos GPU", chip="M1 Ultra", ram=64, storage=1024, price=4629, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source=every, identifier="Mac13,2", model_number="A2615", ram_options=[opt(64, 0), opt(128, 920)], storage_options=[ssd(1024, 0), ssd(2048, 460), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="studio-m2max-2023", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Mediados de 2023", year=2023, month=6, cpu="M2 Max · 12 núcleos CPU / 30 núcleos GPU", chip="M2 Max", ram=32, storage=512, price=2429, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source=every, identifier="Mac14,13", model_number="A2901", ram_options=[opt(32, 0), opt(64, 460), opt(96, 920)], storage_options=[ssd(512, 0), ssd(1024, 230), ssd(2048, 690), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="studio-m2ultra-2023", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Mediados de 2023", year=2023, month=6, cpu="M2 Ultra · 24 núcleos CPU / 60 núcleos GPU", chip="M2 Ultra", ram=64, storage=1024, price=4849, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source=every, identifier="Mac14,14", model_number="A2901", ram_options=[opt(64, 0), opt(128, 920), opt(192, 1840)], storage_options=[ssd(1024, 0), ssd(2048, 460), ssd(4096, 1380), ssd(8192, 2760)]),
        model(id="studio-m4max-2025", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Principios de 2025", year=2025, month=3, cpu="M4 Max · 14 núcleos CPU / 32 núcleos GPU", chip="M4 Max", ram=36, storage=512, price=None, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source="Apple, 5 mar 2025: M4 Max, 36 GB, 512 GB, desde 1.999 $ / 2.099 £. El PVP de España no quedó en las fuentes consultadas.", confidence="media", identifier="Mac16,9", model_number="A3143"),
        model(id="studio-m3ultra-2025", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Principios de 2025", year=2025, month=3, cpu="M3 Ultra · 28 núcleos CPU / 60 núcleos GPU", chip="M3 Ultra", ram=96, storage=1024, price=None, formula="mac-mini", availability="discontinued", ports="many", usb=True, uhd=False, weight="standard", source="Apple, 5 mar 2025: M3 Ultra, 96 GB, 1 TB, desde 3.999 $. PVP España no contrastado. No existió un M4 Ultra.", confidence="media", identifier="Mac15,14", model_number="A3143"),
        model(id="studio-m5max-2026", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M5 Max · 18 núcleos CPU / 32 núcleos GPU", chip="M5 Max", ram=36, storage=512, price=3029, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="standard", source="Applesfera, a la venta el 22 sep 2026: desde 3.029 € (36 GB, 512 GB).", identifier="Mac17,14", model_number="A3545", storage_options=[ssd(512, 0), ssd(1024, 330), ssd(2048, 880), ssd(4096, 1980), ssd(8192, 4180)]),
        model(id="studio-m5max-40-2026", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M5 Max · 18 núcleos CPU / 40 núcleos GPU", chip="M5 Max", ram=48, storage=512, price=3689, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="standard", source="Applesfera, 22 sep 2026: M5 Max 40 núcleos GPU y 48 GB desde 3.689 €.", identifier="Mac17,14", model_number="A3545", ram_options=[opt(48, 0), opt(64, 440), opt(128, 2200)], storage_options=[ssd(512, 0), ssd(1024, 330), ssd(2048, 880), ssd(4096, 1980), ssd(8192, 4180)]),
        model(id="studio-m5ultra-2026", family="mac-studio", name="Mac Studio", size="—", inches=0, generation="Finales de 2026", year=2026, month=9, cpu="M5 Ultra · 30 núcleos CPU / 64 núcleos GPU", chip="M5 Ultra", ram=96, storage=1024, price=6649, formula="mac-mini", availability="current", ports="many", usb=True, uhd=False, weight="standard", source="Applesfera, 22 sep 2026: M5 Ultra desde 6.649 € (96 GB, 1 TB). Hasta 512 GB de memoria unificada.", identifier="Mac17,15", model_number="A3546", ram_options=[opt(96, 0), opt(256, 4400)], storage_options=[ssd(1024, 0), ssd(2048, 550), ssd(4096, 1650), ssd(8192, 3850), ssd(16384, 8250)]),
        model(id="mac-pro-m2ultra-2023", family="mac-pro", name="Mac Pro", size="—", inches=0, generation="Mediados de 2023", year=2023, month=6, cpu="M2 Ultra · 24 núcleos CPU / 60 núcleos GPU", chip="M2 Ultra", ram=64, storage=1024, price=None, formula="macbook-pro", availability="current", ports="many", usb=True, uhd=False, weight="heavy", source="Apple, junio 2023: Mac Pro con M2 Ultra, 64 GB y 1 TB, desde 6.999 $. Sigue siendo el Mac Pro a la venta en noviembre de 2026; no hay sucesor anunciado. PVP España no contrastado.", confidence="media", identifier="Mac14,8", model_number="A2786", ram_options=[opt(64, 0), opt(128, 920), opt(192, 1840)], storage_options=[ssd(1024, 0), ssd(2048, 460), ssd(4096, 1380), ssd(8192, 2760)]),
    ]
    for item in items:
        if item["basePriceEUR"] is None:
            item["priceBasis"] = "launch"
    return items


def main() -> None:
    items = from_hello_csv() + supplemental()
    seen: set[str] = set()
    for item in items:
        base = item["id"]
        suffix = 2
        while item["id"] in seen:
            item["id"] = f"{base}-{suffix}"
            suffix += 1
        seen.add(item["id"])
    items.sort(key=lambda item: (item["formFactor"], item["family"], -item["year"], -item["month"], item["name"], item["cpu"]))
    payload = {
        "name": "hello.",
        "currency": "EUR",
        "region": "ES",
        "asOf": "2026-11-02",
        "note": "Precios de lanzamiento en euros con IVA para España. Los modelos Intel anteriores a 2019 salen de los CSV de hello. 9.4.8. Los posteriores citan la fuente en priceSource. Un launchPriceEUR null significa que el modelo es real pero el PVP español no quedó contrastado: la app no inventa esa cifra.",
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    priced = sum(1 for item in items if item["launchPriceEUR"] or item["basePriceEUR"])
    families = sorted({item["family"] for item in items})
    chips = sorted({item["chip"] for item in items if item["year"] >= 2020 and item["family"] != "macbook"})
    print(f"wrote {len(items)} items ({priced} with a price) -> {OUT}")
    print("families", families)
    print("recent chips", chips)


if __name__ == "__main__":
    main()
