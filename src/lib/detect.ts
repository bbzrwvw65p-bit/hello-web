/**
 * Detección aproximada del Mac desde el navegador.
 *
 * El navegador no dice el modelo exacto. Con tres pistas se puede proponer:
 * 1. Sistema: el agente de usuario dice «Macintosh». Un iPad con Safari se hace pasar por Mac,
 *    pero tiene pantalla táctil (maxTouchPoints > 1), así que se descarta.
 * 2. Chip: el nombre de la gráfica por WebGL. Chrome y Edge suelen dar el chip
 *    («ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, …)»); Safari solo «Apple GPU»,
 *    que no distingue Intel de chip de Apple; Firefox redondea («Apple M1, or similar»).
 * 3. Tamaño: la resolución en puntos y la densidad (devicePixelRatio) de la pantalla
 *    por defecto de cada portátil o iMac. Con monitor externo o escala cambiada no vale.
 *
 * Todo son funciones puras: no guarda nada ni hace llamadas a internet.
 */
import { isAppleSilicon } from "./market";
import type { CatalogItem, FamilyId } from "./types";

export type Signals = {
  userAgent: string;
  platform?: string | null;
  maxTouchPoints: number;
  renderer: string | null;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
};

export type Arch = "apple" | "intel" | "desconocido";

export type ScreenMatch = {
  id: string;
  points: [number, number];
  label: string;
  families: FamilyId[];
  inches: [number, number];
  years?: [number, number];
  /** La resolución solo existe en Mac con chip de Apple (pantallas con muesca, iMac 24″). */
  impliesApple?: boolean;
  /** Es la resolución por defecto (más fiable) o una de las alternativas de escala. */
  exact: boolean;
};

/** Resoluciones en puntos («parece») de las pantallas integradas, a 2×. */
export const SCREEN_TABLE: ScreenMatch[] = [
  { id: "mbp14", points: [1512, 982], label: "MacBook Pro 14″", families: ["macbook-pro"], inches: [14, 14.5], impliesApple: true, exact: true },
  { id: "mbp14-a", points: [1352, 878], label: "MacBook Pro 14″", families: ["macbook-pro"], inches: [14, 14.5], impliesApple: true, exact: false },
  { id: "mbp14-b", points: [1800, 1169], label: "MacBook Pro 14″", families: ["macbook-pro"], inches: [14, 14.5], impliesApple: true, exact: false },
  { id: "mbp16", points: [1728, 1117], label: "MacBook Pro 16″", families: ["macbook-pro"], inches: [16.1, 16.5], impliesApple: true, exact: true },
  { id: "mbp16-a", points: [1496, 967], label: "MacBook Pro 16″", families: ["macbook-pro"], inches: [16.1, 16.5], impliesApple: true, exact: false },
  { id: "mbp16-b", points: [2056, 1329], label: "MacBook Pro 16″", families: ["macbook-pro"], inches: [16.1, 16.5], impliesApple: true, exact: false },
  { id: "mba13n", points: [1470, 956], label: "MacBook Air 13″", families: ["macbook-air"], inches: [13.5, 13.7], impliesApple: true, exact: true },
  { id: "mba15", points: [1710, 1112], label: "MacBook Air 15″", families: ["macbook-air"], inches: [15, 15.5], impliesApple: true, exact: true },
  { id: "m13", points: [1440, 900], label: "MacBook Air o Pro 13″", families: ["macbook-air", "macbook-pro"], inches: [13, 13.4], years: [2016, 2022], exact: true },
  { id: "mbp15", points: [1680, 1050], label: "MacBook Pro 15″", families: ["macbook-pro"], inches: [15.3, 15.5], years: [2016, 2019], exact: true },
  { id: "mbp16i", points: [1536, 960], label: "MacBook Pro 16″", families: ["macbook-pro"], inches: [15.9, 16.05], years: [2019, 2019], exact: true },
  { id: "mb12", points: [1280, 800], label: "MacBook 12″", families: ["macbook"], inches: [12, 12], years: [2015, 2017], exact: false },
  { id: "imac24", points: [2240, 1260], label: "iMac 24″", families: ["imac"], inches: [23.5, 24.5], impliesApple: true, exact: true },
  { id: "imac27", points: [2560, 1440], label: "iMac 27″", families: ["imac"], inches: [27, 27], exact: false },
  { id: "imac21", points: [2048, 1152], label: "iMac 21,5″", families: ["imac"], inches: [21.5, 21.5], exact: false },
];

export type Detection = {
  isMac: boolean;
  arch: Arch;
  /** Chip exacto si la gráfica lo dice, p. ej. «M2 Pro». */
  chip: string | null;
  screen: ScreenMatch | null;
  /** Texto para «Lo que he podido ver». */
  seen: { label: string; value: string; warn?: boolean }[];
};

export function isMacUserAgent(userAgent: string, maxTouchPoints: number, platform?: string | null): boolean {
  const macLike = /Macintosh|Mac OS X/i.test(userAgent) || /^mac/i.test(platform ?? "");
  if (!macLike) return false;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return false;
  // Un iPad con Safari se presenta como Mac, pero es táctil.
  return maxTouchPoints <= 1;
}

export function parseRenderer(renderer: string | null): { arch: Arch; chip: string | null } {
  if (!renderer) return { arch: "desconocido", chip: null };
  const text = renderer.replace(/\s+/g, " ");
  if (/Intel|AMD|ATI Technologies|Radeon|NVIDIA|GeForce/i.test(text)) return { arch: "intel", chip: null };
  const chip = text.match(/Apple (M\d+(?: (?:Pro|Max|Ultra))?)\b/);
  if (chip && !/or similar/i.test(text)) return { arch: "apple", chip: chip[1] };
  if (chip) return { arch: "apple", chip: null };
  // «Apple GPU» (Safari) no dice si es Intel o chip de Apple.
  return { arch: "desconocido", chip: null };
}

export function matchScreen(width: number, height: number, dpr: number): ScreenMatch | null {
  if (dpr < 1.5) return null; // 1×: casi siempre un monitor externo.
  const w = Math.max(width, height);
  const h = Math.min(width, height);
  return SCREEN_TABLE.find((entry) => Math.abs(entry.points[0] - w) <= 2 && Math.abs(entry.points[1] - h) <= 2) ?? null;
}

export function detect(signals: Signals): Detection {
  const isMac = isMacUserAgent(signals.userAgent, signals.maxTouchPoints, signals.platform);
  const parsed = parseRenderer(signals.renderer);
  const screen = isMac ? matchScreen(signals.screenWidth, signals.screenHeight, signals.devicePixelRatio) : null;
  let arch = parsed.arch;
  if (arch === "desconocido" && screen?.impliesApple) arch = "apple";
  const seen: Detection["seen"] = [
    { label: "Sistema", value: isMac ? "macOS ✓" : "No parece un Mac", warn: !isMac },
    {
      label: "Chip",
      value: parsed.chip ? `Apple ${parsed.chip}` : arch === "apple" ? (signals.renderer && /Apple GPU/i.test(signals.renderer) ? "De Apple (gráfica «Apple GPU» + pantalla)" : "De Apple") : arch === "intel" ? "Intel" : "No lo dice",
      warn: arch === "desconocido",
    },
    { label: "Pantalla", value: `${Math.round(Math.max(signals.screenWidth, signals.screenHeight))} × ${Math.round(Math.min(signals.screenWidth, signals.screenHeight))} pt · ${Math.round(signals.devicePixelRatio * 10) / 10}×` },
    { label: "Tamaño", value: screen ? `≈ ${screen.label.replace(/^(MacBook Air o Pro|MacBook Pro|MacBook Air|MacBook|iMac) /, "")} · ${screen.families.includes("imac") ? "sobremesa" : "portátil"}` : "No lo sé (¿monitor externo?)", warn: !screen },
    { label: "Modelo exacto", value: "No lo dice", warn: true },
  ];
  return { isMac, arch, chip: parsed.chip, screen, seen };
}

export type Candidate = { item: CatalogItem; likelihood: "Más probable" | "Probable" | "Posible"; title: string };

const LIKELIHOOD: Candidate["likelihood"][] = ["Más probable", "Probable", "Posible"];

function tierOfChip(chip: string): "base" | "pro" | "max" | "ultra" {
  if (/Ultra/i.test(chip)) return "ultra";
  if (/Max/i.test(chip)) return "max";
  if (/Pro/i.test(chip)) return "pro";
  return "base";
}

function chipName(chip: string): string {
  const intel = chip.trim().match(/^i(\d)$/i);
  return intel ? `Intel Core i${intel[1]}` : chip.trim();
}

function generationKey(item: CatalogItem): string {
  const m = item.chip.match(/^M(\d+)/);
  return m ? `M${m[1]}` : `${item.year}`;
}

function modelKey(item: CatalogItem): string {
  return `${item.family}|${item.screenInches}|${item.chip}|${item.year}`;
}

/** Hasta tres modelos, del más al menos probable. `asOfYear` fija la edad típica de quien pregunta. */
export function candidatesFor(detection: Detection, catalog: CatalogItem[], asOfYear: number): Candidate[] {
  if (!detection.isMac) return [];
  const { screen, arch, chip } = detection;
  let pool = catalog.filter((item) => item.year >= 2012);
  if (screen) {
    pool = pool.filter((item) => screen.families.includes(item.family) && item.screenInches >= screen.inches[0] - 0.05 && item.screenInches <= screen.inches[1] + 0.05);
    if (screen.years) pool = pool.filter((item) => item.year >= screen.years![0] && item.year <= screen.years![1]);
  } else {
    // Sin tamaño fiable solo proponemos si el chip es exacto.
    if (!chip) return [];
  }
  if (arch === "apple") pool = pool.filter(isAppleSilicon);
  if (arch === "intel") pool = pool.filter((item) => !isAppleSilicon(item));
  if (chip) pool = pool.filter((item) => item.chip.trim().toLowerCase() === chip.toLowerCase());
  if (!pool.length) return [];

  // Un representante por modelo: la configuración más barata de salida.
  const byModel = new Map<string, CatalogItem>();
  for (const item of pool) {
    const key = modelKey(item);
    const current = byModel.get(key);
    if (!current || (item.launchPriceEUR ?? Infinity) < (current.launchPriceEUR ?? Infinity)) byModel.set(key, item);
  }
  const typicalYear = asOfYear - 3; // quien pregunta por su Mac suele tenerlo desde hace unos años
  const score = (item: CatalogItem) => {
    let value = -Math.abs(item.year - typicalYear);
    if (item.year > asOfYear - 1) value -= 1; // los recién salidos, menos probables
    const tier = tierOfChip(item.chip);
    const proLaptop = item.family === "macbook-pro" && item.screenInches >= 14;
    if (proLaptop) value -= tier === "pro" ? 0 : tier === "base" ? 0.6 : 1;
    else value -= tier === "base" ? 0 : tier === "pro" ? 0.5 : 1;
    return value;
  };
  const models = [...byModel.values()].sort((a, b) => score(b) - score(a) || b.year - a.year);
  // Uno por generación (o por tamaño si el chip es exacto) para que las tres opciones se distingan.
  const seen = new Set<string>();
  const picked: CatalogItem[] = [];
  for (const item of models) {
    const key = chip ? `${item.family}|${item.screenInches}` : `${item.family}|${generationKey(item)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length === 3) break;
  }
  return picked.map((item, index) => ({
    item,
    likelihood: picked.length === 1 ? "Más probable" : LIKELIHOOD[index],
    title: `${item.name} ${item.sizeLabel !== "—" ? `${item.sizeLabel} ` : ""}${chipName(item.chip)}`.replace(/\s+/g, " ").trim(),
  }));
}

/** «Parece que usas un MacBook Pro 14″ con chip de Apple. ¿Es este?» */
export function headline(detection: Detection, candidates: Candidate[]): string | null {
  if (!detection.isMac || !candidates.length) return null;
  const chipText = detection.chip ? ` con chip ${detection.chip}` : detection.arch === "apple" ? " con chip de Apple" : detection.arch === "intel" ? " con procesador Intel" : "";
  const body = detection.screen ? `${detection.screen.label.replace("MacBook Air o Pro 13″", "MacBook de 13″")}${chipText}` : `Mac${chipText}`;
  return `Parece que usas un ${body}. ${candidates.length === 1 ? "¿Es este?" : "¿Es alguno de estos?"}`;
}

/** Lee las pistas del navegador. Solo en el cliente; no guarda nada. */
export function readSignals(): Signals | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  let renderer: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    renderer = null;
  }
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return {
    userAgent: navigator.userAgent,
    platform: uaData?.platform ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    renderer,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}
