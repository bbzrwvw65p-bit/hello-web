import { chipRank } from "./depreciation";
import { eur, modelTitle, ramLabel, storageLabel } from "./format";
import { DEFAULT_STATE, marketValue, priceDataset, supportLevel } from "./market";
import type { CatalogItem, RecommendAnswers, StorageOption } from "./types";

export type SuggestionRole = "encaja" | "ahorro" | "superior";

export type Suggestion = {
  role: SuggestionRole;
  roleTitle: string;
  item: CatalogItem;
  ramGB: number;
  storageIndex: number;
  priceEUR: number;
  /** "segunda-mano": estimado entre particulares, cuando Apple no tiene ese modelo reacondicionado. */
  priceKind: "nuevo" | "reacondicionado" | "segunda-mano";
  priceSource: string;
  priceDate: string;
  configLabel: string;
  why: string;
  tradeoff: string;
  overBudgetEUR: number;
  newPriceEUR: number | null;
  score: number;
};

export type Recommendation = {
  suggestions: Suggestion[];
  minimumEUR: number | null;
  relaxed: string | null;
};

const BIG_CHIP = /\bM\d+\s*(max|ultra)\b/i;
const PRO_CHIP = /\bM\d+\s*(pro|max|ultra)\b/i;

const AS_OF = () => new Date();
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Offer = {
  item: CatalogItem;
  ramGB: number;
  storage: StorageOption;
  storageIndex: number;
  priceEUR: number;
  priceKind: Suggestion["priceKind"];
  priceSource: string;
  priceDate: string;
  score: number;
};

function lineKey(item: CatalogItem): string {
  const chip = item.chip.toLowerCase().replace(/\s+/g, "");
  const size = item.screenInches ? Math.round(item.screenInches) : 0;
  return `${item.family}-${size}-${chip}-${item.year}`;
}

function launchDate(item: CatalogItem): string {
  const month = MONTHS[item.month - 1] ?? "";
  return `${month} de ${item.year}`;
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${Number(day)} ${SHORT_MONTHS[Number(month) - 1] ?? month} ${year}`;
}

function sourceDetail(text: string): string {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=\.)\s/);
  const head = parts[0] ?? text;
  const hike = parts.find((part) => /subid/i.test(part));
  const joined = hike && !head.includes(hike) ? `${head} ${hike}` : head;
  return joined.length > 190 ? `${joined.slice(0, 187)}…` : joined;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function eligible(item: CatalogItem, answers: RecommendAnswers): boolean {
  if (supportLevel(item) !== "full") return false;
  if (item.family === "macbook") return false;
  if (item.launchPriceEUR == null) return false;
  if (item.formFactor !== answers.formFactor) return false;
  if (answers.formFactor === "desktop") {
    if (answers.desktopUse === "aio" && item.family !== "imac") return false;
    if (answers.desktopUse === "external" && item.family === "imac") return false;
  }
  if (answers.profile === "personal" && BIG_CHIP.test(item.chip)) return false;
  if (answers.profile === "pro" && item.family === "macbook-neo") return false;
  if (answers.profile === "extreme" && !PRO_CHIP.test(item.chip)) return false;
  if (answers.formFactor === "portable" && answers.mobility === "light") {
    if (item.weight === "heavy" || item.screenInches >= 15) return false;
  }
  if (answers.formFactor === "portable" && answers.manyPorts === "yes" && item.family === "macbook-neo") return false;
  if (answers.formFactor === "portable" && answers.mobility === "power") {
    if (item.family === "macbook-neo" || item.family === "macbook-air") return false;
  }
  if (answers.bigScreen === "yes" && item.formFactor === "portable" && item.screenInches > 0 && item.screenInches < 15) return false;
  if (answers.bigScreen === "no" && item.formFactor === "portable" && item.screenInches >= 15) return false;
  return true;
}

function fitness(item: CatalogItem, answers: RecommendAnswers, ramGB: number, storageGB: number): number {
  let score = chipRank(item.chip, item.year) * 8 + item.year + ramGB / 8 + storageGB / 2048;
  if (item.availability === "current" || item.availability === "preorder") score += 4;
  if (answers.mobility === "light" && item.weight === "light") score += 12;
  if (answers.mobility === "power" && item.family === "macbook-pro") score += 8;
  if (answers.profile !== "personal" && ["macbook-pro", "mac-studio", "mac-pro", "imac"].includes(item.family)) score += 10;
  if (answers.profile === "extreme" && ["macbook-pro", "mac-studio"].includes(item.family)) score += 6;
  if (answers.profile === "personal" && ["macbook-air", "macbook-neo", "imac", "mac-mini"].includes(item.family)) score += 6;
  // HDMI y lector SD sin adaptadores solo los trae el MacBook Pro desde 2021.
  if (answers.manyPorts === "yes" && item.formFactor === "portable" && item.family === "macbook-pro") score += 25;
  else if (answers.manyPorts === "yes" && item.ports === "many") score += 4;
  if (answers.uhd === "yes" && (item.builtInUhd || item.drivesUhd)) score += 2;
  if (answers.profile !== "personal" && answers.bigScreen !== "no" && item.screenInches >= 16) score += 6;
  else if (answers.profile !== "personal" && answers.bigScreen !== "no" && item.screenInches >= 15) score += 2;
  if (BIG_CHIP.test(item.chip)) score += answers.profile === "extreme" ? 10 : answers.profile === "pro" ? 0 : -8;
  return score;
}

function newOffer(item: CatalogItem, answers: RecommendAnswers): Offer | null {
  if (item.availability === "discontinued" || item.launchPriceEUR == null) return null;
  const storage = item.storageOptions[0];
  if (!storage?.gb) return null;
  return {
    item,
    ramGB: item.ramGB,
    storage,
    storageIndex: 0,
    priceEUR: item.launchPriceEUR,
    priceKind: "nuevo",
    priceSource: "Precio de lanzamiento en Apple España",
    priceDate: launchDate(item),
    score: fitness(item, answers, item.ramGB, storage.gb),
  };
}

function refurbOffer(items: CatalogItem[], answers: RecommendAnswers, asOf: Date): Offer | null {
  let best: Offer | null = null;
  for (const item of items) {
    if (item.availability === "preorder") continue;
    const rams = item.ramOptions.length ? item.ramOptions : [{ gb: item.ramGB, priceEUR: 0 }];
    item.storageOptions.forEach((storage, storageIndex) => {
      if (!storage.gb) return;
      for (const ram of rams) {
        const quote = marketValue(item, ram.gb, storage, DEFAULT_STATE, asOf);
        const exact = quote?.comparables.filter((row) => row.exact) ?? [];
        if (!quote || exact.length < 2) continue;
        const price = Math.round(median(exact.map((row) => row.priceEUR)));
        const offer: Offer = {
          item,
          ramGB: ram.gb,
          storage,
          storageIndex,
          priceEUR: price,
          priceKind: "reacondicionado",
          priceSource: "Apple Reacondicionado, España",
          priceDate: shortDate(exact[0]?.observedOn ?? "2026-11-02"),
          score: fitness(item, answers, ram.gb, storage.gb),
        };
        if (!best || offer.priceEUR < best.priceEUR) best = offer;
      }
    });
  }
  return best ?? privateOffer(items, answers, asOf);
}

/**
 * Sin stock en Apple Reacondicionado, el usado real en España está en Wallapop y
 * Milanuncios. Se estima lo que pide un particular por uno en muy buen estado, con la
 * misma curva que la tasación. Solo modelos descatalogados: los actuales aún no tienen
 * un mercado de segunda mano con precio estable.
 */
function privateOffer(items: CatalogItem[], answers: RecommendAnswers, asOf: Date): Offer | null {
  const item = [...items]
    .filter((entry) => entry.availability === "discontinued")
    .sort((a, b) => (a.launchPriceEUR ?? Infinity) - (b.launchPriceEUR ?? Infinity))[0];
  const storage = item?.storageOptions[0];
  if (!item || !storage?.gb) return null;
  const quote = marketValue(item, item.ramGB, storage, DEFAULT_STATE, asOf);
  if (!quote) return null;
  return {
    item,
    ramGB: item.ramGB,
    storage,
    storageIndex: 0,
    priceEUR: Math.round(quote.privateSell.typical / 10) * 10,
    priceKind: "segunda-mano",
    priceSource: "Estimación entre particulares (Wallapop, Milanuncios), en muy buen estado",
    priceDate: shortDate(priceDataset.observedOn),
    score: fitness(item, answers, item.ramGB, storage.gb),
  };
}

function offersFor(items: CatalogItem[], answers: RecommendAnswers, asOf: Date): Offer[] {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items.filter((entry) => eligible(entry, answers))) {
    const key = lineKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const offers: Offer[] = [];
  for (const group of groups.values()) {
    const primary = [...group].sort((a, b) => (a.launchPriceEUR ?? Infinity) - (b.launchPriceEUR ?? Infinity))[0];
    const fresh = newOffer(primary, answers);
    const used = refurbOffer(group, answers, asOf);
    if (fresh) offers.push(fresh);
    if (used) offers.push(used);
  }
  // Para trabajo exigente, 8 GB no es una recomendación seria.
  const minRam = answers.profile === "personal" ? 0 : 16;
  return offers.filter((offer) => offer.ramGB >= minRam).sort((a, b) => b.score - a.score || a.priceEUR - b.priceEUR);
}

export function relevantDifference(a: CatalogItem, b: CatalogItem): boolean {
  if (a.family !== b.family) return true;
  if (Math.abs(a.screenInches - b.screenInches) >= 1.5) return true;
  if (Math.abs(chipRank(a.chip, a.year) - chipRank(b.chip, b.year)) >= 8) return true;
  if (Math.abs(a.ramGB - b.ramGB) >= 8) return true;
  if (Math.abs(a.year - b.year) >= 2) return true;
  return false;
}

export function offerDifference(a: Offer | Suggestion, b: Offer | Suggestion): boolean {
  if (relevantDifference(a.item, b.item)) return true;
  if (Math.abs(a.ramGB - b.ramGB) >= 8) return true;
  const aDisk = "storage" in a ? a.storage.gb ?? 0 : a.item.storageOptions[a.storageIndex]?.gb ?? 0;
  const bDisk = "storage" in b ? b.storage.gb ?? 0 : b.item.storageOptions[b.storageIndex]?.gb ?? 0;
  if (aDisk > 0 && bDisk > 0 && Math.max(aDisk, bDisk) / Math.min(aDisk, bDisk) >= 2) return true;
  return false;
}

export function priceGap(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(a, b);
}

export function isDominated(worse: { item: CatalogItem; priceEUR: number; ramGB?: number }, better: { item: CatalogItem; priceEUR: number; ramGB?: number }): boolean {
  const worseRank = chipRank(worse.item.chip, worse.item.year) + worse.item.year / 100 + (worse.ramGB ?? worse.item.ramGB) / 64;
  const betterRank = chipRank(better.item.chip, better.item.year) + better.item.year / 100 + (better.ramGB ?? better.item.ramGB) / 64;
  return betterRank > worseRank + 0.5 && better.priceEUR <= worse.priceEUR * 1.02;
}

function configLabel(ramGB: number, storage: StorageOption): string {
  return `${ramLabel(ramGB)} · ${storageLabel(storage.gb, storage.label)}`;
}

function contrast(offer: Offer, fit: Offer): string {
  const bits: string[] = [];
  if (offer.item.chip !== fit.item.chip) bits.push(`${offer.item.chip} en vez de ${fit.item.chip}`);
  if (offer.ramGB !== fit.ramGB) bits.push(`${ramLabel(offer.ramGB)} de memoria en vez de ${ramLabel(fit.ramGB)}`);
  if (Math.abs(offer.item.screenInches - fit.item.screenInches) >= 1.5) bits.push(`pantalla de ${offer.item.sizeLabel || "otro tamaño"} en vez de ${fit.item.sizeLabel}`);
  const offerDisk = offer.storage.gb ?? 0;
  const fitDisk = fit.storage.gb ?? 0;
  if (offerDisk && fitDisk && offerDisk !== fitDisk) bits.push(`disco de ${storageLabel(offer.storage.gb, offer.storage.label)} en vez de ${storageLabel(fit.storage.gb, fit.storage.label)}`);
  if (offer.item.family === "macbook-pro" && fit.item.family !== "macbook-pro" && offer.item.formFactor === "portable") bits.push("HDMI, lector SD y ventilador para cargas largas");
  if (!bits.length) return "más margen para el trabajo";
  return bits.slice(0, 3).join(", ");
}

function usageClause(answers: RecommendAnswers): string {
  if (answers.profile === "extreme") return "Para vídeo pesado, 3D o IA en local";
  if (answers.profile === "pro") return "Para trabajo exigente";
  if (answers.mobility === "light") return "Para llevarlo encima";
  if (answers.formFactor === "desktop" && answers.desktopUse === "aio") return "Para dejarlo en la mesa, con pantalla incluida";
  if (answers.formFactor === "desktop") return "Para dejarlo detrás de un monitor";
  return "Para el día a día";
}

function toSuggestion(role: SuggestionRole, offer: Offer, fit: Offer, answers: RecommendAnswers): Suggestion {
  const name = `${modelTitle(offer.item)} con ${offer.item.chip}`;
  const cfg = configLabel(offer.ramGB, offer.storage);
  const over = Math.max(0, Math.round(offer.priceEUR - answers.budget));
  const gap = Math.abs(offer.priceEUR - fit.priceEUR);
  let roleTitle = "La que encaja";
  let why = `${usageClause(answers)}, ${name} (${cfg}) es la más capaz que cabe en ${eur(answers.budget)}.`;
  let tradeoff = familyTradeoff(offer, answers);
  if (role === "encaja" && over > 0) {
    why = `${usageClause(answers)}, ${name} (${cfg}) se pasa ${eur(over)} de tu presupuesto, pero por ese margen es la que más te da.`;
    tradeoff = `Son ${eur(over)} más de lo que marcaste.`;
  }
  if (role === "ahorro") {
    roleTitle = "Ahorro de verdad";
    const channel = offer.priceKind === "reacondicionado" ? "reacondicionado por Apple" : offer.priceKind === "segunda-mano" ? "de segunda mano entre particulares" : "nuevo, un escalón por debajo";
    why = `${name} (${cfg}), ${channel}, son ${eur(gap)} menos que ${modelTitle(fit.item)} con ${fit.item.chip}.`;
    tradeoff = offer.priceKind === "reacondicionado"
      ? `No es a estrenar, pero Apple lo certifica con batería y carcasa nuevas y un año de garantía. ${offer.item.chip} y ${ramLabel(offer.ramGB)}, frente a ${fit.item.chip} y ${ramLabel(fit.ramGB)}.`
      : offer.priceKind === "segunda-mano"
        ? `Precio estimado y sin garantía de Apple: antes de pagar, mira la salud de la batería y que no tenga bloqueo de iCloud. ${offer.item.chip} y ${ramLabel(offer.ramGB)}, frente a ${fit.item.chip} y ${ramLabel(fit.ramGB)}.`
        : `Bajas de verdad: ${contrast(offer, fit)}.`;
  }
  if (role === "superior") {
    roleTitle = "Un paso más";
    why = `${name} (${cfg}) sube respecto a ${modelTitle(fit.item)} con ${fit.item.chip}: ${contrast(offer, fit)}.`;
    tradeoff = over > 0
      ? `${eur(gap)} más que la opción que encaja, y ${eur(over)} por encima de tu presupuesto.`
      : `${eur(gap)} más que la opción que encaja.`;
    if (offer.item.weight === "heavy" && fit.item.weight !== "heavy") tradeoff += " También pesa más.";
  }
  return {
    role,
    roleTitle,
    item: offer.item,
    ramGB: offer.ramGB,
    storageIndex: offer.storageIndex,
    priceEUR: offer.priceEUR,
    priceKind: offer.priceKind,
    priceSource: offer.priceKind === "nuevo" ? `${offer.priceSource}. ${sourceDetail(offer.item.priceSource)}` : offer.priceSource,
    priceDate: offer.priceDate,
    configLabel: cfg,
    why,
    tradeoff,
    overBudgetEUR: over,
    newPriceEUR: offer.item.launchPriceEUR,
    score: offer.score,
  };
}

function familyTradeoff(offer: Offer, answers: RecommendAnswers): string {
  const { item } = offer;
  let text: string;
  if (item.family === "macbook-neo") text = "8 GB y 256 GB van justos en cuanto acumulas pestañas y archivos. El salto que compensa es un Air, y sale más caro.";
  else if (item.family === "macbook-air") text = answers.profile === "personal" ? "Sin ventilador: para clase, oficina y fotos va sobrado; en exportaciones de vídeo largas baja el ritmo." : "Sin ventilador: en sesiones largas de vídeo o compilación baja el ritmo frente a un Pro.";
  else if (item.family === "macbook-pro") text = "Pesa y cuesta más que un Air; a cambio, mejor pantalla, HDMI, lector SD y rendimiento sostenido.";
  else if (item.family === "imac") text = "No se amplía después: elige bien la memoria y el disco al comprarlo.";
  else if (item.family === "mac-mini") text = "Monitor, teclado y ratón van aparte: súmalos al presupuesto.";
  else if (item.family === "mac-studio") text = "Pensado para cargas muy pesadas. Monitor, teclado y ratón van aparte.";
  else text = "Equipo de trabajo: el presupuesto se queda ahí.";
  if (offer.ramGB <= 8 && item.family !== "macbook-neo") text += " Con 8 GB va justo para muchas pestañas o fotos pesadas.";
  if (answers.manyPorts === "yes" && item.formFactor === "portable" && item.family !== "macbook-pro") text += " Para HDMI o tarjetas SD necesitarás un adaptador USB-C.";
  return text;
}

function best(rows: Offer[]): Offer | null {
  return [...rows].sort((a, b) => b.score - a.score || a.priceEUR - b.priceEUR)[0] ?? null;
}

export function recommend(items: CatalogItem[], answers: RecommendAnswers, asOf = AS_OF()): Recommendation {
  const pool = offersFor(items, answers, asOf);
  const channel = answers.condition === "any" ? pool : answers.condition === "new" ? pool.filter((offer) => offer.priceKind === "nuevo") : pool.filter((offer) => offer.priceKind !== "nuevo");
  // A quien quiere nuevo no se le propone un usado sin garantía como alternativa.
  const alternatives = answers.condition === "new" ? pool.filter((offer) => offer.priceKind !== "segunda-mano") : pool;
  const note = null;

  if (!channel.length) {
    const prices = pool.map((offer) => offer.priceEUR);
    return { suggestions: [], minimumEUR: prices.length ? Math.min(...prices) : null, relaxed: note };
  }

  const under = channel.filter((offer) => offer.priceEUR <= answers.budget);
  const stretch = channel.filter((offer) => offer.priceEUR <= answers.budget * 1.08);
  const fit = best(stretch.length ? stretch : under);
  if (!fit) {
    return { suggestions: [], minimumEUR: Math.min(...channel.map((offer) => offer.priceEUR)), relaxed: note };
  }

  const savings = best(
    alternatives.filter((offer) => offer.item.id !== fit.item.id && offer.priceEUR <= fit.priceEUR * 0.85 && offer.priceEUR <= answers.budget && offerDifference(offer, fit) && !isDominated(offer, fit)),
  );
  const superior = [...alternatives]
    .filter((offer) => offer.item.id !== fit.item.id && offer.priceEUR >= fit.priceEUR * 1.12 && offer.priceEUR <= answers.budget * 1.45 && offer.score > fit.score && offerDifference(offer, fit) && !isDominated(fit, offer))
    .sort((a, b) => a.priceEUR - b.priceEUR)[0] ?? null;

  let suggestions = [toSuggestion("encaja", fit, fit, answers)];
  if (savings) suggestions.push(toSuggestion("ahorro", savings, fit, answers));
  if (superior) suggestions.push(toSuggestion("superior", superior, fit, answers));
  suggestions = dropCloseOrDominated(suggestions);
  const roleOrder: Record<SuggestionRole, number> = { encaja: 0, ahorro: 1, superior: 2 };
  suggestions.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  return { suggestions, minimumEUR: null, relaxed: note };
}

export function dropCloseOrDominated(list: Suggestion[]): Suggestion[] {
  const kept: Suggestion[] = [];
  for (const candidate of list) {
    const clash = kept.find((other) => priceGap(candidate.priceEUR, other.priceEUR) < 0.1 && !offerDifference(candidate, other));
    if (clash) {
      if (candidate.score > clash.score) kept.splice(kept.indexOf(clash), 1, candidate);
      continue;
    }
    if (kept.some((other) => isDominated(candidate, other))) continue;
    for (let index = kept.length - 1; index >= 0; index -= 1) {
      if (isDominated(kept[index], candidate)) kept.splice(index, 1);
    }
    kept.push(candidate);
  }
  return kept;
}
