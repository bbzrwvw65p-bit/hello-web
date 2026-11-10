import type { CatalogItem } from "./types";

export function eur(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
}

export function eurRange(low: number, high: number): string {
  if (low === high) return `Aprox. ${eur(low)}`;
  return `${eur(low)} – ${eur(high)}`;
}

export function generationEs(generation: string): string {
  return generation
    .replace(/\*\*?New\*\*?\s*/gi, "")
    .replace(/Early/gi, "Principios de")
    .replace(/Mid/gi, "Mediados de")
    .replace(/Late/gi, "Finales de")
    .replace(/\s+/g, " ")
    .trim();
}

export function ramLabel(gb: number): string {
  if (gb < 1) return `${gb.toLocaleString("es-ES")} GB`;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(gb)} GB`;
}

export function storageLabel(gb: number | null, fallback: string): string {
  if (gb == null) return fallback;
  if (gb >= 1024 && gb % 1024 === 0) return `${gb / 1024} TB`;
  return `${gb} GB`;
}

export function modelTitle(item: CatalogItem): string {
  if (!item.screenInches) return item.name;
  return `${item.name} ${item.sizeLabel}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const FAMILY_ICON: Record<CatalogItem["family"], string> = {
  "macbook-air": "/hello/macbook-air.png",
  "macbook-pro": "/hello/macbook-pro.png",
  macbook: "/hello/macbook.png",
  "macbook-neo": "/hello/macbook.png",
  "mac-mini": "/hello/mac-mini.png",
  imac: "/hello/imac.png",
  "mac-studio": "/hello/mac-mini.png",
  "mac-pro": "/hello/mac-pro.png",
};

export const FAMILY_LABEL: Record<CatalogItem["family"], string> = {
  "macbook-air": "MacBook Air",
  "macbook-pro": "MacBook Pro",
  macbook: "MacBook",
  "macbook-neo": "MacBook Neo",
  "mac-mini": "Mac mini",
  imac: "iMac",
  "mac-studio": "Mac Studio",
  "mac-pro": "Mac Pro",
};
