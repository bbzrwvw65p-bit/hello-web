import observationsFile from "@/data/market/observations.json";
import { getCatalog } from "./catalog";
import { eur } from "./format";
import { ageYears } from "./depreciation";
import type { CatalogItem, StorageOption } from "./types";

export type Grade = "como-nuevo" | "muy-bueno" | "bueno" | "aceptable";
export type Defect = "golpes" | "marcas" | "pantalla" | "teclado" | "puertos" | "liquido" | "placa" | "bloqueo";

export const DEFECTS: { id: Defect; label: string; portableOnly?: boolean }[] = [
  { id: "golpes", label: "Golpes o abolladuras" },
  { id: "marcas", label: "Marcas en la pantalla" },
  { id: "pantalla", label: "Pantalla rota o con líneas" },
  { id: "teclado", label: "Teclas o trackpad que fallan", portableOnly: true },
  { id: "puertos", label: "Puerto, altavoz o cámara que falla" },
  { id: "liquido", label: "Se mojó" },
  { id: "placa", label: "No enciende o falla la placa" },
  { id: "bloqueo", label: "Bloqueo de iCloud o de empresa (MDM)" },
];

export type MachineState = {
  grade: Grade;
  batteryHealth: number | null;
  cycleCount: number | null;
  appleCareMonths: number;
  /** Caja original. */
  boxAndCharger: boolean;
  /** Cargador original en un portátil; teclado y ratón o trackpad en un iMac. */
  charger: boolean;
  /** Factura de compra a nombre del vendedor. */
  invoice: boolean;
  keyboard: "es" | "other" | "na";
  nanoTexture: boolean;
  defects: Defect[];
};

export type Observation = {
  id: string;
  observedOn: string;
  source: string;
  channel: "refurbished-buy" | "private" | "buyback";
  url: string;
  title: string;
  family: string;
  chip: string | null;
  cpuCores: number | null;
  gpuCores: number | null;
  year: number | null;
  screenInches: number | null;
  ramGB: number | null;
  storageGB: number | null;
  color: string | null;
  priceEUR: number;
  currency: "EUR";
};

export type Comparable = {
  title: string;
  priceEUR: number;
  ramGB: number | null;
  storageGB: number | null;
  observedOn: string;
  source: string;
  url: string;
  exact: boolean;
};

export type ChannelQuote = { low: number; typical: number; high: number };

export type MarketValuation = {
  privateSell: ChannelQuote;
  buyback: ChannelQuote;
  refurbishedBuy: ChannelQuote;
  confidence: "alta" | "media" | "baja" | "modelo";
  comparableCount: number;
  comparables: Comparable[];
  method: string;
  recalibrated: boolean;
  ageYears: number;
  retention: number;
  notes: string[];
};

const storedFile = observationsFile as { observedOn: string; source: string; observations: Observation[] };
const STORED = storedFile.observations;

export const priceDataset = {
  observedOn: storedFile.observedOn,
  source: storedFile.source,
};

/**
 * Retention of launch price on the certified-refurbished channel, fitted to the
 * Apple Spain grid of 2 Nov 2026 (see data/market/observations.json).
 *
 * Young consumer machines (Air M5 16/512 → 1.209 € vs 1.199 € new, Neo 679 vs 699,
 * iMac M4 8/8 1.439 vs 1.519) keep about e^(-0.035·años).
 * Pro laptops fall faster (16" M4 Pro 24/512 → 2.539 € vs 2.949 € new): e^(-0.07·años)
 * for the first three years. After that the slope steepens: the sample has no
 * machine older than two years, so the tail is an extrapolation and confidence drops.
 *
 * RAM elasticity 0.40 and storage elasticity 0.24 come from pairs in that same grid
 * (Air M5 16→24 GB and 512 GB→1 TB). Doubling RAM is about +32%, doubling SSD about +18%,
 * not the euro sticker Apple charged for the option.
 *
 * Colour did not move a single price in the grid.
 */
const RAM_ELASTICITY = 0.4;
const STORAGE_ELASTICITY = 0.24;
const PRIVATE_OF_REFURB = 0.84;
const BUYBACK_OF_PRIVATE = 0.68;

const GRADE_FACTOR: Record<Grade, number> = {
  "como-nuevo": 1.08,
  "muy-bueno": 1,
  bueno: 0.9,
  aceptable: 0.74,
};

const DEFECT_FACTOR: Record<Defect, number> = {
  golpes: 0.93,
  marcas: 0.88,
  pantalla: 0.6,
  teclado: 0.85,
  puertos: 0.9,
  liquido: 0.55,
  placa: 0.35,
  bloqueo: 0.25,
};

export function defectLabel(defect: Defect): string {
  return DEFECTS.find((entry) => entry.id === defect)?.label ?? defect;
}

export function batteryLabel(health: number | null): string {
  if (health == null) return "Batería sin comprobar";
  if (health >= 90) return "Batería 90% o más";
  if (health >= 85) return "Batería 85–89%";
  if (health >= 80) return "Batería 80–84%";
  return "Batería por debajo del 80%";
}

export function gradeLabel(grade: Grade): string {
  return { "como-nuevo": "Como nuevo", "muy-bueno": "Muy bueno", bueno: "Bueno", aceptable: "Aceptable" }[grade];
}

export function appleCareLabel(months: number): string {
  if (months <= 0) return "Sin AppleCare";
  if (months < 12) return "Garantía < 1 año";
  return "Garantía > 1 año";
}

export const DEFAULT_STATE: MachineState = {
  grade: "muy-bueno",
  batteryHealth: 92,
  cycleCount: null,
  appleCareMonths: 0,
  boxAndCharger: true,
  charger: true,
  invoice: true,
  keyboard: "es",
  nanoTexture: false,
  defects: [],
};

export function nanoAvailable(item: CatalogItem): boolean {
  if (item.family === "macbook-pro" && item.year >= 2021 && item.screenInches >= 14) return true;
  return item.family === "imac" && item.year >= 2024;
}

export function supportLevel(item: CatalogItem): "full" | "security" | "none" {
  if (isAppleSilicon(item)) return "full";
  if (item.family === "macbook-pro" && item.screenInches >= 16 && item.year === 2019) return "security";
  if (item.id === "mbp-13-2020-4ports") return "security";
  if (item.family === "imac" && item.screenInches >= 27 && item.year === 2020) return "security";
  if (item.family === "mac-pro" && item.year === 2019 && /xeon/i.test(item.chip)) return "security";
  return "none";
}

/**
 * Apple silicon de verdad. En los CSV de 2019 el Core m3/m5/m7 de Intel y algunos
 * iMac y MacBook Pro de 2015 llevan "M3" o "m5" en el campo chip: sin el año, la app
 * los tomaba por un M3 o un M5 con soporte completo y los tasaba muy por encima.
 */
export function isAppleSilicon(item: CatalogItem): boolean {
  if (item.year < 2020) return false;
  return /^M\d/.test(item.chip.trim()) || /a1\d/i.test(item.chip);
}

export function hasButterflyKeyboard(item: CatalogItem): boolean {
  if (item.family === "macbook" && item.year >= 2015 && item.year <= 2017 && item.screenInches <= 13) return true;
  if (item.family === "macbook-air" && item.year >= 2018 && item.year <= 2019) return true;
  if (item.family === "macbook-pro" && item.year >= 2016 && item.year <= 2019 && item.screenInches < 16) return true;
  return false;
}

function isProSegment(item: CatalogItem): boolean {
  return item.family === "macbook-pro" || item.family === "mac-studio" || item.family === "mac-pro";
}

/** Fraction of the launch price a certified refurbished unit still commands. */
export function refurbishedRetention(item: CatalogItem, age: number): number {
  if (item.availability === "preorder" || age <= 0) return 1;
  const support = supportLevel(item);
  const pro = isProSegment(item);
  const kEarly = support === "full" ? (pro ? 0.07 : 0.035) : support === "security" ? 0.08 : 0.09;
  const kLate = support === "full" ? (pro ? 0.1 : 0.08) : 0.2;
  const early = Math.exp(-kEarly * Math.min(age, 3));
  // Fuera de soporte el valor cae rápido hasta los 8 años y luego se aplana: un Mac
  // que enciende siempre tiene comprador por piezas, pantalla o batería.
  const late = support === "full"
    ? Math.exp(-kLate * Math.max(0, age - 3))
    : Math.exp(-kLate * Math.min(5, Math.max(0, age - 3))) * Math.exp(-0.05 * Math.max(0, age - 8));
  let factor = early * late;
  if (support === "security") factor *= 0.75;
  if (support === "none") factor *= 0.62;
  if (hasButterflyKeyboard(item)) factor *= 0.88;
  return Math.min(1.06, Math.max(0.04, factor));
}

function specFactor(item: CatalogItem, ramGB: number, storage: StorageOption): number {
  const baseRam = item.ramGB > 0 ? item.ramGB : ramGB;
  const baseStorage = item.storageGB && item.storageGB > 0 ? item.storageGB : storage.gb;
  let factor = 1;
  if (baseRam > 0 && ramGB > 0) factor *= (ramGB / baseRam) ** RAM_ELASTICITY;
  if (baseStorage && storage.gb && storage.gb > 0) factor *= (storage.gb / baseStorage) ** STORAGE_ELASTICITY;
  if (storage.kind !== item.storageKind) {
    if (storage.kind === "hdd") factor *= 0.72;
    if (storage.kind === "fusion") factor *= 0.85;
    if (item.storageKind === "hdd" && storage.kind === "ssd") factor *= 1 / 0.72;
  }
  return Math.min(2.6, Math.max(0.55, factor));
}

type Tier = "base" | "pro" | "max" | "ultra";

function tierOf(item: CatalogItem): Tier {
  const chip = item.chip.toLowerCase();
  if (chip.includes("ultra")) return "ultra";
  if (chip.includes("max")) return "max";
  if (chip.includes("pro") && !chip.includes("a18")) return "pro";
  return "base";
}

function chipGeneration(item: CatalogItem): number | null {
  const match = item.chip.match(/^M(\d+)/);
  return match && isAppleSilicon(item) ? Number(match[1]) : null;
}

/** Lo que se paga por un Mac usado frente al nuevo que lo sustituye hoy, por generaciones de chip. */
const SUCCESSOR_SHARE = [1, 0.88, 0.8, 0.74, 0.66, 0.6, 0.55];

function sameLine(a: CatalogItem, b: CatalogItem): boolean {
  return a.family === b.family && tierOf(a) === tierOf(b) && screensClose(a.screenInches, b.screenInches);
}

/**
 * Techo por sucesor. Apple bajó mucho los precios de salida (el Air M2 salió a 1.519 €,
 * el M5 a 1.199 € con el doble de memoria), así que anclar un Mac de 2022 a su precio de
 * lanzamiento lo sobrevaloraba. Un usado no se paga más que una parte del nuevo que lo
 * sustituye hoy en la tienda, ajustada por memoria y disco.
 */
export function successorCap(item: CatalogItem, ramGB: number, storage: StorageOption): { cap: number; successor: CatalogItem; generations: number } | null {
  const generation = chipGeneration(item);
  if (generation == null || item.availability !== "discontinued") return null;
  const successors = getCatalog().filter(
    (entry) => entry.availability === "current" && entry.launchPriceEUR != null && sameLine(entry, item) && (chipGeneration(entry) ?? 0) > generation,
  );
  if (!successors.length) return null;
  const successor = successors.sort((a, b) => (a.launchPriceEUR ?? 0) - (b.launchPriceEUR ?? 0))[0];
  const generations = (chipGeneration(successor) ?? generation) - generation;
  const share = SUCCESSOR_SHARE[Math.min(generations, SUCCESSOR_SHARE.length - 1)];
  let spec = 1;
  if (successor.ramGB > 0 && ramGB > 0) spec *= (ramGB / successor.ramGB) ** RAM_ELASTICITY;
  if (successor.storageGB && storage.gb) spec *= (storage.gb / successor.storageGB) ** STORAGE_ELASTICITY;
  spec = Math.min(2.6, Math.max(0.45, spec));
  return { cap: (successor.launchPriceEUR as number) * share * spec, successor, generations };
}

/**
 * Para los modelos reales sin PVP español contrastado (MacBook Pro Max, M3 Pro, Mac Studio
 * de 2025, iMac M3) se toma el PVP más bajo de un hermano de la misma línea a tres años
 * o menos. La confianza baja y la ficha lo dice.
 */
export function siblingLaunch(item: CatalogItem): { price: number; sibling: CatalogItem } | null {
  if (!isAppleSilicon(item)) return null;
  const siblings = getCatalog().filter(
    (entry) => entry.id !== item.id && entry.launchPriceEUR != null && sameLine(entry, item) && Math.abs(entry.year - item.year) <= 3 && isAppleSilicon(entry),
  );
  if (!siblings.length) return null;
  const sibling = siblings.sort((a, b) => (a.launchPriceEUR ?? 0) - (b.launchPriceEUR ?? 0))[0];
  return { price: sibling.launchPriceEUR as number, sibling };
}

function appleNewPrice(item: CatalogItem, ramGB: number, storage: StorageOption): number | null {
  const base = item.launchPriceEUR ?? (item.priceBasis === "launch" ? item.basePriceEUR : null);
  if (base == null) return null;
  const ram = item.ramOptions.find((option) => option.gb === ramGB);
  return base + (ram?.priceEUR ?? 0) + storage.priceEUR;
}

function conditionFactor(item: CatalogItem, state: MachineState): { factor: number; notes: string[] } {
  const notes: string[] = [];
  let factor = GRADE_FACTOR[state.grade];
  if (item.formFactor === "portable") {
    const health = state.batteryHealth;
    if (health == null) {
      factor *= 0.97;
      notes.push("Sin el dato de la batería, quien compra descuenta algo. Míralo en Ajustes del Sistema > Batería.");
    } else {
      const battery = health >= 90 ? 1 : health >= 85 ? 0.97 : health >= 80 ? 0.94 : 0.86;
      factor *= battery;
      if (health < 80) notes.push("Batería por debajo del 80%: macOS pide servicio y quien compra resta lo que cuesta cambiarla.");
      else if (battery < 1) notes.push(`${batteryLabel(health)}: resta un poco.`);
    }
    if (state.cycleCount != null && state.cycleCount > 400) {
      const hit = Math.min(0.08, ((state.cycleCount - 400) / 200) * 0.02);
      factor *= 1 - hit;
      notes.push(state.cycleCount > 600 ? "Más de 600 ciclos de batería: resta algo más." : "Entre 300 y 600 ciclos de batería.");
    }
  }
  if (state.appleCareMonths > 0) {
    factor *= Math.min(1.04, 1 + state.appleCareMonths * 0.0015);
    notes.push(state.appleCareMonths >= 12 ? "Más de un año de garantía o AppleCare+: suma un poco." : "Le queda garantía o AppleCare+ unos meses: suma poco.");
  }
  const accessory = item.formFactor === "portable" ? "cargador" : item.family === "imac" ? "teclado y ratón" : null;
  if (accessory && !state.charger) {
    factor *= item.formFactor === "portable" ? 0.95 : 0.94;
    notes.push(item.formFactor === "portable" ? "Sin el cargador original: un cargador de Apple nuevo cuesta 60–90 €." : "Sin el teclado y el ratón originales del iMac.");
  }
  if (!state.boxAndCharger) {
    factor *= 0.98;
    notes.push("Sin la caja original.");
  }
  if (!state.invoice) {
    factor *= 0.95;
    notes.push("Sin factura: los compradores y las tiendas la piden para descartar que sea robado.");
  }
  if (item.formFactor === "portable" && state.keyboard === "other") {
    factor *= 0.94;
    notes.push("Teclado sin ñ (inglés u otro idioma): en España se vende peor.");
  }
  if (state.nanoTexture && nanoAvailable(item)) {
    factor *= 1.03;
    notes.push("Vidrio nanotexturizado: Apple lo cobraba aparte; el mercado conserva una parte pequeña.");
  }
  const defects = state.defects.filter((defect) => item.formFactor === "portable" || defect !== "teclado");
  for (const defect of defects) factor *= DEFECT_FACTOR[defect];
  if (defects.includes("bloqueo")) notes.push("Con bloqueo de activación o MDM solo se vende para piezas. Quítalo antes de vender si puedes.");
  else if (defects.includes("placa") || defects.includes("liquido")) notes.push("Con daño de placa o de líquido el precio es casi de piezas: pide presupuesto de reparación antes de vender.");
  if (defects.length) notes.push(`Defectos: ${defects.map((defect) => defectLabel(defect).toLowerCase()).join(", ")}.`);
  if (hasButterflyKeyboard(item)) notes.push("Teclado de mariposa: el mercado sigue descontando esa generación.");
  const support = supportLevel(item);
  if (support === "none") notes.push("Sin macOS 27 ni Tahoe: ya no recibe sistema nuevo y eso pesa en el precio.");
  if (support === "security") notes.push("Se queda en macOS Tahoe, solo con actualizaciones de seguridad.");
  return { factor: Math.max(0.12, factor), notes };
}

function chipKey(chip: string | null): string {
  return (chip ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function screensClose(a: number, b: number): boolean {
  if (!a || !b) return true;
  return Math.abs(a - b) < 1.3;
}

function parsedCores(cpu: string): { cpu: number | null; gpu: number | null } {
  const cpuMatch = cpu.match(/(\d+)\s*núcleos CPU/i);
  const gpuMatch = cpu.match(/(\d+)\s*núcleos GPU/i);
  return {
    cpu: cpuMatch ? Number(cpuMatch[1]) : null,
    gpu: gpuMatch ? Number(gpuMatch[1]) : null,
  };
}

function exactMatch(item: CatalogItem, ramGB: number, storageGB: number | null, observation: Observation): boolean {
  if (observation.family !== item.family) return false;
  if (chipKey(observation.chip) !== chipKey(item.chip)) return false;
  if (!screensClose(item.screenInches, observation.screenInches ?? 0)) return false;
  if (observation.year != null && Math.abs(observation.year - item.year) > 1) return false;
  if (observation.ramGB == null || observation.ramGB !== ramGB) return false;
  if (storageGB == null || observation.storageGB == null || observation.storageGB !== storageGB) return false;
  const cores = parsedCores(item.cpu);
  if (observation.cpuCores != null && cores.cpu != null && observation.cpuCores !== cores.cpu) return false;
  if (observation.gpuCores != null && cores.gpu != null && observation.gpuCores !== cores.gpu) return false;
  return true;
}

function looseMatch(item: CatalogItem, observation: Observation): boolean {
  if (observation.family !== item.family) return false;
  const obsChip = chipKey(observation.chip);
  const itemChip = chipKey(item.chip);
  if (!obsChip || !itemChip) return false;
  if (obsChip !== itemChip && !obsChip.startsWith(itemChip) && !itemChip.startsWith(obsChip)) return false;
  return screensClose(item.screenInches, observation.screenInches ?? 0);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function roundEuro(value: number): number {
  return Math.max(40, Math.round(value));
}

function band(typical: number, spread: number): ChannelQuote {
  return {
    low: roundEuro(typical * (1 - spread)),
    typical: roundEuro(typical),
    high: roundEuro(typical * (1 + spread)),
  };
}

function launchAnchor(item: CatalogItem): { launch: number | null; snapshot: number | null; sibling: CatalogItem | null } {
  if (item.priceBasis === "used-snapshot" && item.launchPriceEUR == null) {
    return { launch: null, snapshot: item.basePriceEUR, sibling: null };
  }
  const launch = item.launchPriceEUR ?? item.basePriceEUR;
  if (launch != null) return { launch, snapshot: null, sibling: null };
  const guess = siblingLaunch(item);
  return { launch: guess?.price ?? null, snapshot: null, sibling: guess?.sibling ?? null };
}

export function marketValue(
  item: CatalogItem,
  ramGB: number,
  storage: StorageOption,
  state: MachineState,
  asOf: Date,
  extra: Observation[] = [],
): MarketValuation | null {
  const anchor = launchAnchor(item);
  const byId = new Map<string, Observation>();
  for (const observation of [...STORED, ...extra]) byId.set(observation.id, observation);
  const pool = [...byId.values()];
  const exact = pool.filter((observation) => exactMatch(item, ramGB, storage.gb, observation));
  if (anchor.launch == null && anchor.snapshot == null && !exact.length) return null;

  const age = Math.max(0, ageYears(item.year, item.month, asOf));
  const retention = refurbishedRetention(item, age);
  const spec = specFactor(item, ramGB, storage);
  const loose = pool.filter((observation) => !exact.includes(observation) && looseMatch(item, observation)).slice(0, 4);

  let refurbRaw: number;
  if (anchor.launch == null && anchor.snapshot == null) {
    refurbRaw = median(exact.map((observation) => observation.priceEUR));
  } else if (anchor.launch != null) {
    refurbRaw = anchor.launch * spec * retention;
  } else {
    const then = new Date(Date.UTC(2019, 5, 1));
    const ageThen = Math.max(0.25, ageYears(item.year, item.month, then));
    const retentionThen = refurbishedRetention(item, ageThen);
    refurbRaw = ((anchor.snapshot as number) / PRIVATE_OF_REFURB) * (retention / retentionThen) * spec;
  }

  const successor = successorCap(item, ramGB, storage);
  const capped = successor != null && successor.cap < refurbRaw;
  if (successor && capped) refurbRaw = successor.cap;

  const appleNew = appleNewPrice(item, ramGB, storage);
  if (appleNew != null && age > 0.75) refurbRaw = Math.min(refurbRaw, appleNew);
  if (appleNew != null && age <= 0.75) refurbRaw = Math.min(refurbRaw, appleNew * 1.06);

  const storedPrice = new Map(STORED.map((observation) => [observation.id, observation.priceEUR]));
  const recalibrated = exact.some((observation) => extra.some((live) => live.id === observation.id) && storedPrice.get(observation.id) !== observation.priceEUR);
  const exactMedian = exact.length ? median(exact.map((observation) => observation.priceEUR)) : null;
  let refurbTypical = refurbRaw;
  if (exactMedian != null && exact.length >= 2) {
    refurbTypical = exactMedian;
  } else if (exactMedian != null) {
    refurbTypical = refurbRaw * 0.35 + exactMedian * 0.65;
  }

  const { factor, notes } = conditionFactor(item, state);
  const privateRaw = item.availability === "preorder" ? refurbTypical : refurbTypical * PRIVATE_OF_REFURB * factor;
  const buybackRaw = item.availability === "preorder" ? refurbTypical : privateRaw * BUYBACK_OF_PRIVATE;

  const confidence: MarketValuation["confidence"] =
    exact.length >= 4 ? "alta" : exact.length >= 2 ? "media" : exact.length === 1 || anchor.sibling ? "baja" : age > 2.5 || supportLevel(item) !== "full" ? "modelo" : "baja";

  const refurbSpread = exact.length >= 2 ? 0.04 : confidence === "modelo" ? 0.16 : 0.1;
  const privateSpread = Math.max(refurbSpread, 0.12);
  const refurbishedBuy = exact.length >= 2
    ? {
        low: roundEuro(Math.min(...exact.map((observation) => observation.priceEUR)) * 0.98),
        typical: roundEuro(refurbTypical),
        high: roundEuro(Math.max(...exact.map((observation) => observation.priceEUR)) * 1.02),
      }
    : band(refurbTypical, refurbSpread);

  const notesOut = [...notes];
  if (item.availability === "preorder") {
    notesOut.unshift("Aún no hay mercado de segunda mano: el precio es el de lanzamiento.");
  } else if (!exact.length) {
    notesOut.unshift("Sin un anuncio idéntico en el reacondicionado oficial: la cifra sale de la curva de depreciación, así que tómala como orientación.");
  } else {
    notesOut.unshift(`${exact.length} anuncios iguales en el reacondicionado oficial anclan el precio de compra certificada.`);
  }
  if (anchor.sibling && !exact.length) {
    notesOut.splice(1, 0, `No hay PVP español contrastado de este modelo: se parte del de ${anchor.sibling.name} ${anchor.sibling.sizeLabel !== "—" ? anchor.sibling.sizeLabel + " " : ""}con ${anchor.sibling.chip} (${anchor.sibling.year}).`);
  }
  if (successor && capped) {
    const name = `${successor.successor.name} con ${successor.successor.chip}`;
    notesOut.splice(1, 0, `Hoy el ${name} nuevo sale a ${eur(successor.successor.launchPriceEUR ?? 0)}: con ${successor.generations} ${successor.generations === 1 ? "generación" : "generaciones"} de diferencia, este no se paga más que una parte de eso.`);
  }

  if (!exact.length || extra.length === 0) {
    notesOut.push("Los precios de venta salen del reacondicionado: a un particular, un 16 % menos; a una tienda, otro 32 % menos.");
  }

  const comparables: Comparable[] = [...exact, ...loose].slice(0, 6).map((observation) => ({
    title: observation.title,
    priceEUR: observation.priceEUR,
    ramGB: observation.ramGB,
    storageGB: observation.storageGB,
    observedOn: observation.observedOn,
    source: observation.source,
    url: observation.url,
    exact: exact.includes(observation),
  }));

  return {
    privateSell: band(privateRaw, privateSpread),
    buyback: band(buybackRaw, privateSpread + 0.02),
    refurbishedBuy,
    confidence: item.availability === "preorder" ? "modelo" : confidence,
    comparableCount: exact.length,
    comparables,
    method: exact.length
      ? "Curva ajustada al dataset y mezclada con anuncios de la misma configuración."
      : `Curva de depreciación ajustada al reacondicionado oficial en España (${priceDataset.observedOn}), por soporte de macOS, segmento y ampliaciones.`,
    recalibrated,
    ageYears: age,
    retention,
    notes: notesOut,
  };
}

export function parseState(params: { get(name: string): string | null }): MachineState {
  const grade = params.get("g");
  const grades: Grade[] = ["como-nuevo", "muy-bueno", "bueno", "aceptable"];
  const battery = params.get("bat");
  const cycles = params.get("cyc");
  const defects = (params.get("def") ?? "")
    .split(",")
    .filter((token): token is Defect => DEFECTS.some((entry) => entry.id === token));
  return {
    grade: grades.includes(grade as Grade) ? (grade as Grade) : DEFAULT_STATE.grade,
    batteryHealth: battery == null || battery === "" ? DEFAULT_STATE.batteryHealth : battery === "nd" ? null : Number(battery),
    cycleCount: cycles == null || cycles === "" ? null : Number(cycles),
    appleCareMonths: Number(params.get("care") ?? 0) || 0,
    boxAndCharger: params.get("box") !== "0",
    charger: params.get("chg") !== "0",
    invoice: params.get("fac") !== "0",
    keyboard: params.get("kb") === "ot" ? "other" : params.get("kb") === "na" ? "na" : "es",
    nanoTexture: params.get("nano") === "1",
    defects,
  };
}

export function stateQuery(state: MachineState): string {
  const params = new URLSearchParams();
  params.set("g", state.grade);
  params.set("bat", state.batteryHealth == null ? "nd" : String(state.batteryHealth));
  if (state.cycleCount != null) params.set("cyc", String(state.cycleCount));
  if (state.appleCareMonths) params.set("care", String(state.appleCareMonths));
  params.set("box", state.boxAndCharger ? "1" : "0");
  params.set("chg", state.charger ? "1" : "0");
  params.set("fac", state.invoice ? "1" : "0");
  params.set("kb", state.keyboard === "other" ? "ot" : state.keyboard === "na" ? "na" : "es");
  if (state.nanoTexture) params.set("nano", "1");
  if (state.defects.length) params.set("def", state.defects.join(","));
  return params.toString();
}
