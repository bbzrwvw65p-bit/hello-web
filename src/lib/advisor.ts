import { getCatalog } from "./catalog";
import { chipRank } from "./depreciation";
import { amortisation, channels, datasetDate, newPrice, resaleIn, storageAt, type Amortisation, type Channels } from "./economics";
import { eur, modelTitle, ramLabel, storageLabel } from "./format";
import type { Use } from "./glossary";
import { INTEL_DISCLAIMER, lifecycle, type Lifecycle } from "./lifecycle";
import { isAppleSilicon } from "./market";
import { bandwidthOf, specsOf, tierOf, type Specs, type Tier } from "./specs";
import { trapsFor, type Trap } from "./traps";
import type { CatalogItem, FamilyId } from "./types";

export type Mode = "novato" | "normal" | "experto";
export type Source = "nuevo" | "reacondicionado" | "particular";
export type Port = "hdmi" | "sd" | "magsafe" | "ethernet";

export type ExpertSpec = {
  gen: number | null;
  tier: Tier | null;
  ram: number | null;
  ssd: number | null;
  screen: "13" | "14" | "15" | "16" | "24" | "sin" | null;
};

export type Answers = {
  mode: Mode;
  uses: Use[];
  load: "poco" | "bastante" | "mucho";
  keepYears: number;
  progKind: "web" | "movil" | "datos";
  docker: boolean;
  xcode: boolean;
  mediaKind: "foto" | "video" | "ambos";
  resolution: "1080" | "4k" | "8k";
  mediaApp: "lightroom" | "photoshop" | "finalcut" | "premiere" | "davinci" | "otra";
  audioLoad: "pocas" | "muchas" | "orquesta";
  live: boolean;
  aiSize: 7 | 14 | 30 | 70 | 120;
  aiTask: "chat" | "codigo" | "imagen";
  gameHow: "nativo" | "nube" | "windows";
  gameLevel: "casual" | "serio";
  fanWhy: ("diseno" | "potencia" | "coleccion" | "nano")[];
  form: "portatil" | "sobremesa" | "igual";
  move: "casa" | "aveces" | "diario";
  desktopKind: "todo" | "caja" | "igual";
  externalDisplays: number;
  brightLight: boolean;
  want120: boolean;
  ports: Port[];
  budget: number;
  flexible: boolean;
  sources: Source[];
  expert: ExpertSpec;
};

export const DEFAULT_ANSWERS: Answers = {
  mode: "normal",
  uses: [],
  load: "bastante",
  keepYears: 5,
  progKind: "web",
  docker: false,
  xcode: false,
  mediaKind: "foto",
  resolution: "4k",
  mediaApp: "otra",
  audioLoad: "pocas",
  live: false,
  aiSize: 14,
  aiTask: "chat",
  gameHow: "nativo",
  gameLevel: "casual",
  fanWhy: [],
  form: "portatil",
  move: "aveces",
  desktopKind: "igual",
  externalDisplays: 0,
  brightLight: false,
  want120: false,
  ports: [],
  budget: 900,
  flexible: true,
  sources: ["nuevo", "reacondicionado", "particular"],
  expert: { gen: null, tier: null, ram: null, ssd: null, screen: null },
};

const TIER_RANK: Record<Tier, number> = { base: 0, pro: 1, max: 2, ultra: 3 };

export type Need = {
  minRam: number;
  recRam: number;
  minSsd: number;
  minRank: number;
  preferTier: Tier;
  formFactors: CatalogItem["formFactor"][];
  families: FamilyId[] | null;
  maxWeight: number | null;
  minDisplays: number;
  ports: Port[];
  want120: boolean;
  brightLight: boolean;
  nano: boolean;
  intelOk: boolean;
  aboveNeedOk: boolean;
  preferFanless: boolean;
  preferColor: boolean;
  fastMemory: boolean;
  sustained: boolean;
  reasons: string[];
  notes: string[];
};

export function deriveNeed(a: Answers): Need {
  const need: Need = {
    minRam: 8,
    recRam: 16,
    minSsd: 256,
    minRank: 0,
    preferTier: "base",
    formFactors: a.form === "portatil" ? ["portable"] : a.form === "sobremesa" ? ["desktop"] : ["portable", "desktop"],
    families: null,
    maxWeight: null,
    minDisplays: a.mode === "novato" ? 0 : a.externalDisplays,
    ports: a.mode === "novato" ? [] : a.ports,
    want120: a.mode !== "novato" && a.want120,
    brightLight: a.brightLight,
    nano: false,
    intelOk: false,
    aboveNeedOk: false,
    preferFanless: false,
    preferColor: false,
    fastMemory: false,
    sustained: false,
    reasons: [],
    notes: [],
  };
  const bump = (ram: number, rec: number, why?: string) => {
    need.minRam = Math.max(need.minRam, ram);
    need.recRam = Math.max(need.recRam, rec);
    if (why) need.reasons.push(why);
  };
  const ssd = (gb: number) => (need.minSsd = Math.max(need.minSsd, gb));
  const rank = (value: number) => (need.minRank = Math.max(need.minRank, value));
  const tier = (value: Tier) => {
    if (TIER_RANK[value] > TIER_RANK[need.preferTier]) need.preferTier = value;
  };
  const uses = a.uses.length ? a.uses : (["basico"] as Use[]);

  if (uses.includes("basico")) {
    if (a.load === "poco") bump(8, 16, "Para lo básico con pocas cosas abiertas, 8 GB funcionan, pero 16 GB te dan años de margen.");
    else if (a.load === "bastante") bump(16, 16, "Con bastantes cosas abiertas a la vez, 16 GB.");
    else bump(16, 24, "Con muchísimas pestañas y apps a la vez, 16 GB como mínimo y 24 GB para ir sobrado.");
  }
  if (uses.includes("oficina")) bump(16, 16, "Oficina pesada: Excel grandes, muchas pestañas y videollamadas piden 16 GB.");
  if (uses.includes("programar")) {
    ssd(512);
    if (a.progKind === "web" && !a.docker && !a.xcode) bump(16, 16, "Programación web: 16 GB y 512 GB.");
    if (a.progKind === "movil" || a.xcode) bump(16, 24, "Xcode y los simuladores: 16 GB mínimo, 24 GB cómodo, y 512 GB porque Xcode ocupa mucho.");
    if (a.progKind === "datos") bump(16, 32, "Datos y notebooks: la RAM manda, 16–32 GB.");
    if (a.docker) {
      bump(24, 32, "Docker o máquinas virtuales reservan memoria fija: 24 GB mínimo, 32 GB ideal.");
      ssd(512);
    }
    rank(50);
  }
  if (uses.includes("foto")) {
    ssd(512);
    if (a.mediaKind === "foto") bump(16, 16, "Foto: 16 GB y 512 GB; las bibliotecas crecen rápido.");
    if (a.mediaKind !== "foto") {
      if (a.resolution === "1080") bump(16, 16, "Vídeo 1080p: cualquier chip de Apple lo edita con soltura.");
      if (a.resolution === "4k") {
        bump(16, 24, "Vídeo 4K: 16–24 GB y un chip M2 o posterior; un Pro acelera la exportación.");
        need.sustained = true;
        rank(58);
        ssd(1024);
      }
      if (a.resolution === "8k") {
        bump(48, 64, "Vídeo 8K: hace falta un Max con 48–64 GB y mucho disco.");
        rank(74);
        tier("max");
        ssd(2048);
        need.sustained = true;
      }
    }
    if (a.mediaApp === "davinci") {
      rank(need.minRank + 8);
      need.notes.push("DaVinci Resolve tira mucho de la gráfica: un escalón más de chip se nota.");
    }
    if (a.mediaApp === "premiere") need.recRam = Math.max(need.recRam, need.minRam + 8);
    if (a.mediaApp === "finalcut") need.notes.push("Final Cut está muy optimizado: un chip base reciente rinde más de lo que parece.");
  }
  if (uses.includes("audio")) {
    if (a.audioLoad === "pocas") bump(16, 16, "Música con pocas pistas: 16 GB.");
    if (a.audioLoad === "muchas") {
      bump(16, 24, "Muchas pistas y plugins: 16–24 GB.");
      rank(50);
    }
    if (a.audioLoad === "orquesta") {
      bump(32, 64, "Bibliotecas de orquesta: se cargan en RAM, 32–64 GB y 1 TB de disco.");
      ssd(1024);
      tier("pro");
    }
    if (a.live) {
      need.preferFanless = true;
      need.notes.push("En directo prima la fiabilidad y el silencio: un Air sin ventilador es una gran opción.");
    }
  }
  if (uses.includes("ia")) {
    const table: Record<Answers["aiSize"], [number, number, string]> = {
      7: [16, 16, "Modelos de 7–8B: caben en 16 GB."],
      14: [24, 32, "Modelos de 14B: 24 GB mínimo, 32 GB para ir con contexto largo."],
      30: [36, 48, "Modelos de ~30B: 36–48 GB. Aquí un Max usado brilla por su memoria rápida."],
      70: [64, 96, "Modelos de 70B: 64 GB como mínimo. Un Mac Studio o MacBook Pro Max usado con 64–128 GB es la compra estrella."],
      120: [96, 128, "Modelos de 100B o más: 96–128 GB. Solo un Ultra o un Max de 128 GB, mejor usado."],
    };
    const [min, rec, why] = table[a.aiSize];
    bump(min, rec, why);
    ssd(a.aiSize >= 30 ? 1024 : 512);
    if (a.aiSize >= 30) {
      tier("max");
      need.fastMemory = true;
      need.sustained = true;
    }
    if (a.aiTask === "imagen") {
      rank(58);
      tier("pro");
      need.notes.push("Generar imágenes depende de la gráfica: Pro o Max.");
    }
    need.notes.push("En IA local la memoria unificada lo decide casi todo: el modelo tiene que caber entero en la RAM.");
  }
  if (uses.includes("juegos")) {
    if (a.gameHow === "nube") {
      bump(8, 16);
      need.notes.push("Jugando en la nube cualquier Mac sirve: lo que importa es la conexión, no el chip.");
    } else {
      bump(16, a.gameLevel === "serio" ? 24 : 16, "Para jugar en local: 16 GB.");
      rank(a.gameLevel === "serio" ? 68 : 60);
      if (a.gameLevel === "serio") {
        tier("pro");
        need.sustained = true;
      }
      ssd(512);
    }
  }
  if (uses.includes("entusiasta")) {
    need.aboveNeedOk = true;
    if (a.fanWhy.includes("potencia")) tier("max");
    if (a.fanWhy.includes("nano")) need.nano = true;
    if (a.fanWhy.includes("diseno")) need.preferColor = true;
  }

  if (a.form === "portatil" || a.form === "igual") {
    if (a.move === "diario") need.maxWeight = 1.65;
    if (a.move === "aveces") need.maxWeight = 2.2;
  }
  if (a.form === "sobremesa") {
    if (a.desktopKind === "todo") need.families = ["imac"];
    if (a.desktopKind === "caja") need.families = ["mac-mini", "mac-studio", "mac-pro"];
  }
  const simple = uses.every((use) => use === "basico" || use === "oficina" || use === "juegos") && (!uses.includes("juegos") || a.gameHow === "nube");
  need.intelOk = simple;
  return need;
}

export type Offer = {
  item: CatalogItem;
  ramGB: number;
  storageIndex: number;
  storageGB: number | null;
  channels: Channels;
  source: Source;
  priceEUR: number;
  adaptersEUR: number;
  life: Lifecycle;
  specs: Specs;
  amort: Amortisation;
  resale2: number | null;
  resale3: number | null;
  traps: Trap[];
  softMisses: string[];
  justRam: boolean;
  overBudget: boolean;
  score: number;
};

export type Result = {
  need: Need;
  needTitle: string;
  needText: string;
  primary: Offer | null;
  alternatives: { label: string; offer: Offer }[];
  newRef: Offer | null;
  savingEUR: number | null;
  notNeeded: { text: string; savingEUR: number | null }[];
  stepUp: { worth: boolean; text: string } | null;
  gaming: string | null;
  intelWarning: string | null;
  expertFlags: string[];
  cheapestOutOfBudget: Offer | null;
};

function lineKey(item: CatalogItem): string {
  return `${item.family}-${Math.round(item.screenInches || 0)}-${item.chip.toLowerCase().replace(/\s+/g, "")}-${item.year}`;
}

function sourceAllowed(sources: Source[], source: Source): boolean {
  return sources.includes(source);
}

function eligibleItem(item: CatalogItem, need: Need): boolean {
  if (item.family === "macbook") return false;
  if (!need.formFactors.includes(item.formFactor)) return false;
  if (need.families && !need.families.includes(item.family)) return false;
  if (!isAppleSilicon(item)) {
    if (!need.intelOk) return false;
    if (lifecycle(item).latestVersion < 15) return false;
  }
  return true;
}

function pickRam(item: CatalogItem, target: number, minimum: number): { gb: number; just: boolean } | null {
  const options = (item.ramOptions.length ? item.ramOptions.map((option) => option.gb) : [item.ramGB]).sort((x, y) => x - y);
  const fit = options.find((gb) => gb >= target);
  if (fit != null) return { gb: fit, just: false };
  const max = options[options.length - 1];
  if (max >= minimum) return { gb: max, just: true };
  return null;
}

function pickStorage(item: CatalogItem, minSsd: number): number | null {
  let fallback: number | null = null;
  for (let index = 0; index < item.storageOptions.length; index += 1) {
    const gb = item.storageOptions[index].gb;
    if (gb == null) continue;
    if (gb >= minSsd) return index;
    fallback = index;
  }
  if (fallback != null && (item.storageOptions[fallback].gb ?? 0) >= minSsd / 2) return fallback;
  return null;
}

type BuildOptions = { sources: Source[]; budget: number | null; keepYears: number; asOf: Date; newRefPrice: number | null; useRec: boolean };

function buildOffer(item: CatalogItem, need: Need, opts: BuildOptions, forceRam?: number, forceStorage?: number): Offer | null {
  const target = forceRam ?? (opts.useRec ? need.recRam : need.minRam);
  const ram = forceRam != null ? { gb: forceRam, just: false } : pickRam(item, target, need.minRam);
  if (!ram) return null;
  const storageIndex = forceStorage ?? pickStorage(item, need.minSsd);
  if (storageIndex == null) return null;
  if (chipRank(item.chip, item.year) < need.minRank) return null;
  const specs = specsOf(item);
  if (need.minDisplays > 0 && specs.externalDisplays < need.minDisplays) return null;
  if (need.maxWeight != null && item.formFactor === "portable" && (specs.weightKg ?? 3) > need.maxWeight) return null;
  const ch = channels(item, ram.gb, storageIndex, opts.asOf);
  const candidates: { source: Source; price: number }[] = [];
  if (ch.nuevo && sourceAllowed(opts.sources, "nuevo")) candidates.push({ source: "nuevo", price: ch.nuevo.typical });
  if (ch.reacondicionado && sourceAllowed(opts.sources, "reacondicionado")) candidates.push({ source: "reacondicionado", price: ch.reacondicionado.typical });
  if (ch.particular && sourceAllowed(opts.sources, "particular")) candidates.push({ source: "particular", price: ch.particular.typical });
  if (!candidates.length) return null;
  const best = candidates.sort((x, y) => x.price - y.price)[0];

  const softMisses: string[] = [];
  let adapters = 0;
  for (const port of need.ports) {
    const has = port === "hdmi" ? specs.hdmi : port === "sd" ? specs.sd : port === "magsafe" ? specs.magsafe || item.formFactor === "desktop" : specs.ethernet;
    if (!has) {
      if (port === "magsafe") {
        softMisses.push("Sin MagSafe");
      } else {
        adapters += 25;
        softMisses.push(`Sin ${port === "hdmi" ? "HDMI" : port === "sd" ? "lector SD" : "Ethernet"}: adaptador ≈ 25 €`);
      }
    }
  }
  if (need.want120 && !specs.promotion120 && item.formFactor === "portable") softMisses.push("Pantalla a 60 Hz, no 120 Hz");
  if (need.brightLight && item.formFactor === "portable" && (specs.brightnessNits ?? 0) < 1000) softMisses.push("Brillo de 500 nits: con sol directo se queda corto");
  if (need.nano && !specs.nanoOption) softMisses.push("Sin opción de nanotextura");

  const life = lifecycle(item, opts.asOf);
  const price = best.price + adapters;
  const amort = amortisation(item, ram.gb, storageIndex, price, opts.keepYears, opts.asOf, opts.newRefPrice);
  const tierGap = TIER_RANK[tierOf(item)] - TIER_RANK[need.preferTier];

  let score = -amort.perYear;
  if (life.yearsLeft < opts.keepYears) score -= (opts.keepYears - life.yearsLeft) * 45;
  if (!life.appleSilicon) score -= 80;
  if (tierGap < 0) score -= 70 * -tierGap;
  if (tierGap > 0 && !need.aboveNeedOk) score -= 10 * tierGap;
  if (tierGap > 0 && need.aboveNeedOk) score += 15 * tierGap;
  score -= softMisses.length * 18;
  if (ram.just) score -= 25;
  if (need.preferFanless && specs.fanless) score += 20;
  if (need.preferColor && (item.family === "imac" || (item.family === "macbook-air" && item.year >= 2022) || item.family === "macbook-neo")) score += 20;
  if (need.fastMemory) score += bandwidthOf(item) / 2.5; // la IA local va tan rápido como la memoria
  if (need.sustained && specs.fanless) score -= 30;
  const storage = storageAt(item, storageIndex);
  const limit = opts.budget;
  return {
    item,
    ramGB: ram.gb,
    storageIndex,
    storageGB: storage?.gb ?? null,
    channels: ch,
    source: best.source,
    priceEUR: price,
    adaptersEUR: adapters,
    life,
    specs,
    amort,
    resale2: resaleIn(item, ram.gb, storageIndex, 2, opts.asOf),
    resale3: resaleIn(item, ram.gb, storageIndex, 3, opts.asOf),
    traps: trapsFor(item, ram.gb, storage, opts.asOf),
    softMisses,
    justRam: ram.just,
    overBudget: limit != null && price > limit,
    score,
  };
}

function bestPerLine(offers: Offer[]): Offer[] {
  const map = new Map<string, Offer>();
  for (const offer of offers) {
    const key = lineKey(offer.item);
    const current = map.get(key);
    if (!current || offer.score > current.score || (offer.score === current.score && offer.priceEUR < current.priceEUR)) map.set(key, offer);
  }
  return [...map.values()];
}

export function offersFor(need: Need, opts: BuildOptions, catalog: CatalogItem[] = getCatalog()): Offer[] {
  const offers: Offer[] = [];
  for (const item of catalog) {
    if (!eligibleItem(item, need)) continue;
    const offer = buildOffer(item, need, opts);
    if (offer) offers.push(offer);
  }
  return bestPerLine(offers).sort((x, y) => y.score - x.score);
}

function rankText(minRank: number): string {
  if (minRank <= 0) return "cualquier chip de Apple (M1 o posterior)";
  if (minRank <= 50) return "un M1 o posterior";
  if (minRank <= 60) return "un M2 o posterior (o un M1 Pro)";
  if (minRank <= 70) return "un M3 o posterior, o un Pro desde el M2";
  if (minRank <= 80) return "un M4, o un Max desde el M2";
  return "un Max o Pro de las últimas generaciones";
}

function ssdText(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

function needTexts(need: Need, a: Answers): { title: string; text: string } {
  const ram = need.minRam;
  if (a.mode === "novato") {
    const mesa = ram <= 8 ? "una mesa de trabajo normal (8 GB)" : ram <= 16 ? "una mesa de trabajo amplia (16 GB)" : `una mesa de trabajo enorme (${ram} GB)`;
    const armario = need.minSsd <= 256 ? "un armario pequeño (256 GB), suficiente si tus fotos están en la nube" : `un armario de ${ssdText(need.minSsd)}`;
    const extra = need.recRam > ram ? ` Si puedes, ${need.recRam} GB te dan más años de margen.` : "";
    return { title: "Lo que necesitas de verdad", text: `Un Mac con ${mesa} y ${armario}. No necesitas el más potente.${extra}` };
  }
  const tier = need.preferTier === "base" ? "" : ` Mejor con chip ${need.preferTier === "pro" ? "Pro" : need.preferTier === "max" ? "Max" : "Ultra"}.`;
  return {
    title: "Lo que necesitas de verdad",
    text: `${ram} GB de RAM${need.recRam > ram ? ` (${need.recRam} GB para ir sobrado)` : ""}, ${ssdText(need.minSsd)} de SSD y ${rankText(need.minRank)}.${tier}`,
  };
}

const GAMING = {
  nativo: "Hay cada vez más juegos nativos para Mac (Baldur's Gate 3, Cyberpunk 2077, Resident Evil…), pero el catálogo es una fracción del de PC. Comprueba antes que tus juegos salen para Mac.",
  nube: "Jugando en la nube cualquier Mac sirve: lo que cuenta es tener fibra o wifi de 5 GHz. No gastes en chip para esto.",
  windows: "Con CrossOver o las herramientas de Apple para portar juegos funcionan muchos juegos de Windows, pero no los que usan antitrampas (Fortnite, Valorant, Call of Duty…). Whisky dejó de desarrollarse en 2025. macOS 27 es la última versión con Rosetta completa; Apple solo mantendrá una parte para juegos antiguos.",
  serio: "Siendo sinceros: si juegas en serio a juegos de PC, un Mac no es lo ideal. Un PC o una consola te dará más juegos por menos dinero. Si aun así quieres Mac, este es el que mejor lo hace sin tirar el dinero.",
};

function gamingNote(a: Answers): string | null {
  if (!a.uses.includes("juegos")) return null;
  const parts = [GAMING[a.gameHow]];
  if (a.gameLevel === "serio" && a.gameHow !== "nube") parts.push(GAMING.serio);
  return parts.join(" ");
}

function cheapestNewFor(need: Need, keepYears: number, asOf: Date, catalog: CatalogItem[], filter: (offer: Offer) => boolean = () => true): Offer | null {
  const offers = offersFor({ ...need, intelOk: false }, { sources: ["nuevo"], budget: null, keepYears, asOf, newRefPrice: null, useRec: keepYears >= 5 }, catalog);
  return offers.filter(filter).sort((x, y) => x.priceEUR - y.priceEUR)[0] ?? null;
}

function notNeededList(a: Answers, need: Need, primary: Offer, newRef: Offer | null, catalog: CatalogItem[]): { text: string; savingEUR: number | null }[] {
  const out: { text: string; savingEUR: number | null }[] = [];
  const form = primary.item.formFactor;
  if (TIER_RANK[need.preferTier] === 0 && !need.aboveNeedOk) {
    const pro = catalog
      .filter((item) => item.availability === "current" && item.formFactor === form && item.launchPriceEUR != null && TIER_RANK[tierOf(item)] >= 1)
      .sort((x, y) => (x.launchPriceEUR ?? 0) - (y.launchPriceEUR ?? 0))[0];
    const ref = newRef?.priceEUR ?? primary.priceEUR;
    if (pro?.launchPriceEUR) {
      const label = form === "portable" ? "Un MacBook Pro con chip Pro o Max" : "Un Mac con chip Pro, Max o Ultra";
      out.push({ text: `${label}: para lo que haces no notarás la diferencia.`, savingEUR: Math.max(0, pro.launchPriceEUR - ref) });
    }
  }
  const ram = a.keepYears >= 5 ? need.recRam : need.minRam;
  if (ram < 64) {
    const next = ram >= 32 ? 64 : ram >= 24 ? 32 : ram >= 16 ? 32 : 16;
    if (next > ram) out.push({ text: `Más de ${ram} GB de RAM (por ejemplo ${next} GB): no lo vas a aprovechar.`, savingEUR: Math.round(((next - ram) / 8) * 230 / 10) * 10 });
  }
  if (need.minSsd <= 512) out.push({ text: `Más de ${ssdText(need.minSsd)} de SSD dentro del Mac: un disco externo de 1 TB cuesta ≈ 80 €.`, savingEUR: 250 });
  if (!need.want120 && form === "portable" && !primary.specs.promotion120) out.push({ text: "Pantalla de 120 Hz o XDR: agradable, pero no cambia lo que puedes hacer.", savingEUR: null });
  return out.slice(0, 3);
}

function stepUpFor(primary: Offer, pool: Offer[], need: Need): { worth: boolean; text: string } | null {
  const better = pool
    .filter((offer) => offer !== primary && offer.life.appleSilicon && offer.life.yearsLeft >= primary.life.yearsLeft - 0.5 && offer.priceEUR > primary.priceEUR && offer.priceEUR - primary.priceEUR <= Math.max(200, primary.priceEUR * 0.2))
    .map((offer) => {
      const lifeGain = offer.life.yearsLeft - primary.life.yearsLeft;
      const ramGain = offer.ramGB - primary.ramGB;
      const benefit = Math.max(0, lifeGain) * 60 + Math.max(0, ramGain) * 6 + (offer.amort.perYear < primary.amort.perYear ? 40 : 0);
      return { offer, benefit, extra: offer.priceEUR - primary.priceEUR, lifeGain, ramGain };
    })
    .filter((entry) => entry.benefit > 0)
    .sort((x, y) => y.benefit / y.extra - x.benefit / x.extra)[0];
  if (!better) return { worth: false, text: "No compensa subir: por poco más no hay nada que te dé más años o más margen de verdad." };
  const reasons: string[] = [];
  if (better.lifeGain >= 1) reasons.push(`≈ ${Math.round(better.lifeGain)} ${Math.round(better.lifeGain) === 1 ? "año" : "años"} más de soporte`);
  if (better.ramGain > 0) reasons.push(`${better.offer.ramGB} GB de RAM en vez de ${primary.ramGB}`);
  const worth = better.offer.amort.perYear <= primary.amort.perYear * 1.05 || (primary.ramGB < need.recRam && better.offer.ramGB >= need.recRam);
  const name = `${modelTitle(better.offer.item)} ${better.offer.item.chip}`;
  return {
    worth,
    text: worth
      ? `Compensa subir a ${name}: por ${eur(better.extra)} más tienes ${reasons.join(" y ") || "algo más de margen"}, y al año te sale igual o mejor (≈ ${eur(better.offer.amort.perYear)}/año).`
      : `Subir a ${name} cuesta ${eur(better.extra)} más por ${reasons.join(" y ") || "poco"}; al año sale más caro (≈ ${eur(better.offer.amort.perYear)}/año). Solo si te sobra el dinero.`,
  };
}

function expertNeed(a: Answers, base: Need): Need {
  const spec = a.expert;
  const need: Need = { ...base, aboveNeedOk: true, reasons: [], notes: [] };
  if (spec.ram) {
    need.minRam = spec.ram;
    need.recRam = spec.ram;
  }
  if (spec.ssd) need.minSsd = spec.ssd;
  need.minRank = 0;
  if (spec.screen) {
    if (spec.screen === "sin") {
      need.formFactors = ["desktop"];
      need.families = ["mac-mini", "mac-studio", "mac-pro"];
    } else if (spec.screen === "24") {
      need.formFactors = ["desktop"];
      need.families = ["imac"];
    } else {
      need.formFactors = ["portable"];
      need.families = null;
    }
  }
  return need;
}

function expertMatches(offer: Offer, spec: ExpertSpec): boolean {
  const item = offer.item;
  const match = item.chip.match(/^M(\d+)/);
  const generation = match ? Number(match[1]) : /a18/i.test(item.chip) ? 0 : -1;
  if (spec.gen != null && generation < spec.gen) return false;
  if (spec.tier && TIER_RANK[tierOf(item)] < TIER_RANK[spec.tier]) return false;
  if (spec.screen && spec.screen !== "sin" && spec.screen !== "24") {
    const inches = Math.round(item.screenInches);
    const want = Number(spec.screen);
    if (!(Math.abs(inches - want) <= 0.6 || (want === 13 && inches === 14 && item.family === "macbook-air"))) return false;
  }
  return true;
}

function expertFlagsFor(a: Answers, primary: Offer | null): string[] {
  const flags: string[] = [];
  if (!a.uses.length) return flags;
  const useNeed = deriveNeed({ ...a, mode: "normal", expert: DEFAULT_ANSWERS.expert });
  const spec = a.expert;
  if (spec.ram && spec.ram < useNeed.minRam) flags.push(`Te quedas corto: para lo que haces conviene ${useNeed.minRam} GB de RAM como mínimo, no ${spec.ram} GB.`);
  if (spec.ram && spec.ram >= useNeed.recRam * 2 && spec.ram >= 32) flags.push(`Te sobra RAM: con ${useNeed.recRam} GB irías holgado. Pagar ${spec.ram} GB solo tiene sentido si sabes que lo vas a llenar.`);
  if (spec.tier && TIER_RANK[spec.tier] >= TIER_RANK[useNeed.preferTier] + 2) flags.push(`Un chip ${spec.tier === "max" ? "Max" : "Ultra"} es mucho para tu uso: el ${useNeed.preferTier === "base" ? "chip base" : "Pro"} rinde igual en lo tuyo.`);
  if (spec.tier && TIER_RANK[spec.tier] < TIER_RANK[useNeed.preferTier]) flags.push(`Para tu uso iría mejor un chip ${useNeed.preferTier === "pro" ? "Pro" : useNeed.preferTier === "max" ? "Max" : "Ultra"}.`);
  if (spec.ssd && spec.ssd < useNeed.minSsd) flags.push(`${ssdText(spec.ssd)} de SSD se te quedarán cortos: piensa en ${ssdText(useNeed.minSsd)} o un disco externo rápido.`);
  if (spec.ssd && spec.ssd >= 2048 && useNeed.minSsd <= 512) flags.push(`${ssdText(spec.ssd)} internos es caro: un SSD externo rápido cuesta mucho menos.`);
  if (primary && chipRank(primary.item.chip, primary.item.year) < useNeed.minRank) flags.push("El chip que pides va justo para tu uso.");
  if (!flags.length) flags.push("Lo que pides encaja con tu uso: ni te sobra ni te falta.");
  return flags;
}

export function advise(a: Answers, asOf: Date = datasetDate(), catalog: CatalogItem[] = getCatalog()): Result {
  let need = deriveNeed(a);
  if (a.mode === "experto") need = expertNeed(a, need);
  const newRefOffer = cheapestNewFor(need, a.keepYears, asOf, catalog, a.mode === "experto" ? (offer) => expertMatches(offer, a.expert) : undefined);
  const limit = a.flexible ? Math.round(a.budget * 1.15) : a.budget;
  const opts: BuildOptions = { sources: a.sources.length ? a.sources : DEFAULT_ANSWERS.sources, budget: limit, keepYears: a.keepYears, asOf, newRefPrice: newRefOffer?.priceEUR ?? null, useRec: a.keepYears >= 5 && a.mode !== "experto" };
  let all = offersFor(need, opts, catalog);
  if (a.mode === "experto") {
    all = all.filter((offer) => expertMatches(offer, a.expert));
    all.sort((x, y) => x.priceEUR - y.priceEUR || x.amort.perYear - y.amort.perYear);
  }
  const inBudget = all.filter((offer) => !offer.overBudget);
  const primary = inBudget[0] ?? null;
  const cheapestOutOfBudget = primary ? null : [...all].sort((x, y) => x.priceEUR - y.priceEUR)[0] ?? null;

  const alternatives: { label: string; offer: Offer }[] = [];
  if (primary) {
    const others = inBudget.filter((offer) => lineKey(offer.item) !== lineKey(primary.item));
    const cheaper = others.filter((offer) => offer.priceEUR < primary.priceEUR * 0.92 && offer.life.light !== "rojo" && (offer.life.appleSilicon || !primary.life.appleSilicon)).sort((x, y) => y.score - x.score)[0];
    if (cheaper) alternatives.push({ label: "Más barato todavía", offer: cheaper });
    const longer = others
      .filter((offer) => offer !== cheaper && offer.life.yearsLeft >= primary.life.yearsLeft + 1)
      .sort((x, y) => x.amort.perYear - y.amort.perYear)[0];
    if (longer) alternatives.push({ label: "Con más años por delante", offer: longer });
    const fresh = others.filter((offer) => offer.source === "nuevo" && !alternatives.some((alt) => alt.offer === offer)).sort((x, y) => x.priceEUR - y.priceEUR)[0];
    if (primary.source !== "nuevo" && fresh && alternatives.length < 3) alternatives.push({ label: "Si lo prefieres nuevo", offer: fresh });
    if (!alternatives.length && others[0]) alternatives.push({ label: "Otra opción", offer: others[0] });
  }

  const texts = needTexts(need, a);
  const silicon = primary ? primary.life.appleSilicon : true;
  return {
    need,
    needTitle: texts.title,
    needText: a.mode === "experto" ? "Lo más barato con sentido que cumple lo que has pedido." : texts.text,
    primary,
    alternatives: alternatives.slice(0, 3),
    newRef: newRefOffer,
    savingEUR: primary && newRefOffer ? Math.max(0, newRefOffer.priceEUR - primary.priceEUR) : null,
    notNeeded: primary && a.mode !== "experto" ? notNeededList(a, need, primary, newRefOffer, catalog) : [],
    stepUp: primary ? stepUpFor(primary, all.filter((offer) => !offer.overBudget || a.flexible), need) : null,
    gaming: gamingNote(a),
    intelWarning: !silicon || alternatives.some((alt) => !alt.offer.life.appleSilicon) ? INTEL_DISCLAIMER : null,
    expertFlags: a.mode === "experto" ? expertFlagsFor(a, primary) : [],
    cheapestOutOfBudget,
  };
}

export function configLabel(offer: Pick<Offer, "item" | "ramGB" | "storageIndex">): string {
  const storage = storageAt(offer.item, offer.storageIndex);
  return `${ramLabel(offer.ramGB)} · ${storage ? storageLabel(storage.gb, storage.label) : ""}`;
}

export const SOURCE_LABEL: Record<Source, string> = {
  nuevo: "Nuevo",
  reacondicionado: "Reacondicionado",
  particular: "Usado, de particular",
};

export { newPrice };
