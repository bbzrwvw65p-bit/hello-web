import { DEFAULT_STATE, marketValue, priceDataset, type ChannelQuote } from "./market";
import { lifecycle } from "./lifecycle";
import type { CatalogItem, StorageOption } from "./types";

/** Apple ha subido el precio de salida en casi cada generación reciente; se usa ≈ 3 % al año. */
export const PRICE_RISE_PER_YEAR = 0.03;

export function datasetDate(): Date {
  return new Date(`${priceDataset.observedOn}T12:00:00Z`);
}

export function storageAt(item: CatalogItem, index: number): StorageOption | null {
  return item.storageOptions[index] ?? item.storageOptions[0] ?? null;
}

export function newPrice(item: CatalogItem, ramGB: number, storageIndex: number): number | null {
  if (item.availability === "discontinued" || item.launchPriceEUR == null) return null;
  const storage = storageAt(item, storageIndex);
  const ram = item.ramOptions.find((option) => option.gb === ramGB);
  if (!storage || (!ram && ramGB !== item.ramGB)) return null;
  return item.launchPriceEUR + (ram?.priceEUR ?? 0) + storage.priceEUR;
}

export type Channels = {
  nuevo: ChannelQuote | null;
  reacondicionado: ChannelQuote | null;
  particular: ChannelQuote | null;
};

function round10(value: number): number {
  return Math.round(value / 10) * 10;
}

function rounded(quote: ChannelQuote): ChannelQuote {
  return { low: round10(quote.low), typical: round10(quote.typical), high: round10(quote.high) };
}

/** Precios orientativos de compra de una configuración, por canal. Sin tiendas concretas. */
export function channels(item: CatalogItem, ramGB: number, storageIndex: number, asOf: Date = datasetDate()): Channels {
  const storage = storageAt(item, storageIndex);
  const fresh = newPrice(item, ramGB, storageIndex);
  const out: Channels = {
    nuevo: fresh != null ? { low: fresh, typical: fresh, high: fresh } : null,
    reacondicionado: null,
    particular: null,
  };
  if (!storage || item.availability === "preorder") return out;
  const quote = marketValue(item, ramGB, storage, DEFAULT_STATE, asOf);
  if (!quote) return out;
  const young = quote.ageYears < 0.6;
  if (item.year >= 2018 || item.availability !== "discontinued") out.reacondicionado = rounded(quote.refurbishedBuy);
  if (!young) out.particular = rounded(quote.privateSell);
  return out;
}

/** Lo que valdrá entre particulares dentro de `years` años, en muy buen estado. */
export function resaleIn(item: CatalogItem, ramGB: number, storageIndex: number, years: number, asOf: Date = datasetDate()): number | null {
  const storage = storageAt(item, storageIndex);
  if (!storage) return null;
  const quote = marketValue(item, ramGB, storage, DEFAULT_STATE, asOf);
  if (!quote) return null;
  // El mercado entre particulares pierde ≈ 14 % al año en gama de consumo y ≈ 16 % en la Pro
  // (un Air M1 de 1.129 € se vendía por ≈ 500 € cinco años después).
  const pro = item.family === "macbook-pro" || item.family === "mac-studio" || item.family === "mac-pro";
  const yearly = pro ? 0.84 : 0.86;
  const startFromNew = item.availability === "preorder" || quote.ageYears < 0.6;
  const start = startFromNew ? (newPrice(item, ramGB, storageIndex) ?? quote.privateSell.typical) * 0.8 : quote.privateSell.typical;
  const life = lifecycle(item, asOf);
  const when = asOf.getUTCFullYear() + asOf.getUTCMonth() / 12 + years;
  let factor = 1;
  if (when > life.lastMajorYear + 0.7) factor *= 0.88;
  if (when > life.securityEnd) factor *= 0.65;
  return Math.max(30, round10(start * yearly ** years * factor));
}

export type Amortisation = {
  perYear: number;
  usableYears: number;
  pricePaid: number;
  resale: number;
  erosionPerYear: number;
  shortLife: boolean;
  futureReplacement: number | null;
  futureYear: number;
};

/**
 * Coste por año de vida útil: lo que pagas menos lo que recuperarás al venderlo, repartido
 * entre los años que le vas a sacar con soporte, más un pequeño coste por las novedades de
 * macOS que ya no le llegan (Apple las reserva a los chips nuevos).
 */
export function amortisation(
  item: CatalogItem,
  ramGB: number,
  storageIndex: number,
  pricePaid: number,
  keepYears: number,
  asOf: Date = datasetDate(),
  newEquivalent: number | null = null,
): Amortisation {
  const life = lifecycle(item, asOf);
  const usableYears = Math.max(0.5, Math.min(keepYears, life.yearsLeft));
  const resale = Math.min(pricePaid * 0.95, resaleIn(item, ramGB, storageIndex, usableYears, asOf) ?? 0);
  const erosionRate = Math.min(0.12, 0.012 * life.generationsBehind + (life.appleIntelligence ? 0 : 0.04));
  const erosionPerYear = pricePaid * erosionRate;
  const perYear = Math.max(5, Math.round(((pricePaid - resale) / usableYears + erosionPerYear) / 5) * 5);
  const futureYear = Math.round(asOf.getUTCFullYear() + usableYears);
  const futureReplacement = newEquivalent != null ? round10(newEquivalent * (1 + PRICE_RISE_PER_YEAR) ** usableYears) : null;
  return {
    perYear,
    usableYears: Math.round(usableYears * 10) / 10,
    pricePaid,
    resale: Math.round(resale),
    erosionPerYear: Math.round(erosionPerYear),
    shortLife: life.yearsLeft < keepYears,
    futureReplacement,
    futureYear,
  };
}
