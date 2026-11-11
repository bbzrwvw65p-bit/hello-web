import { DEFAULT_ANSWERS, deriveNeed, type Answers } from "./advisor";
import { chipRank } from "./depreciation";
import { channels, datasetDate, resaleIn } from "./economics";
import type { Use } from "./glossary";
import { lifecycle, type Lifecycle } from "./lifecycle";
import { tierOf } from "./specs";
import type { CatalogItem } from "./types";

export type Verdict = {
  kind: "espera" | "planifica" | "cambia";
  headline: string;
  reasons: string[];
  life: Lifecycle;
  valueNow: number | null;
  valueNextYear: number | null;
  waitingCostPerYear: number | null;
  recommendHref: string;
};

const TIER_RANK = { base: 0, pro: 1, max: 2, ultra: 3 } as const;

/** ¿Te sirve tu Mac actual para lo que haces? Si sí, no cambies. */
export function changeOrWait(item: CatalogItem, ramGB: number, storageIndex: number, uses: Use[], extra: Partial<Answers> = {}, asOf: Date = datasetDate()): Verdict {
  const answers: Answers = { ...DEFAULT_ANSWERS, load: "poco", ...extra, uses: uses.length ? uses : ["basico"] };
  const need = deriveNeed(answers);
  const life = lifecycle(item, asOf);
  const reasons: string[] = [];
  const shortRam = ramGB < need.minRam;
  const shortChip = chipRank(item.chip, item.year) < need.minRank;
  const shortTier = TIER_RANK[tierOf(item)] < TIER_RANK[need.preferTier] - 0;
  const storage = item.storageOptions[storageIndex];
  const shortSsd = (storage?.gb ?? 0) < need.minSsd / 2;
  if (shortRam) reasons.push(`Para lo que haces conviene ${need.minRam} GB de RAM y tiene ${ramGB} GB: eso no se amplía.`);
  if (shortChip) reasons.push("El chip se queda corto para tu uso más exigente.");
  if (shortTier && !shortChip && need.preferTier !== "base") reasons.push(`Para tu uso iría mejor un chip ${need.preferTier === "pro" ? "Pro" : "Max"}, aunque puedes seguir con este.`);
  if (shortSsd) reasons.push("El disco se te queda pequeño; un SSD externo lo arregla por poco dinero.");
  if (!life.appleSilicon) reasons.push("Es Intel: sin Apple Intelligence ni macOS 27.");
  if (life.light === "rojo") reasons.push("Ya no recibe parches de seguridad.");
  if (life.light === "amarillo") reasons.push(`Le quedan menos de 2 años de parches (≈ hasta ${Math.floor(life.securityEnd)}).`);

  const ch = channels(item, ramGB, storageIndex, asOf);
  const valueNow = ch.particular?.typical ?? null;
  const valueNextYear = resaleIn(item, ramGB, storageIndex, 1, asOf);
  const waitingCostPerYear = valueNow != null && valueNextYear != null ? Math.max(0, valueNow - valueNextYear) : null;

  const years = Math.max(1, Math.floor(life.yearsLeft));
  let kind: Verdict["kind"];
  let headline: string;
  if (shortRam || shortChip || life.light === "rojo") {
    kind = "cambia";
    headline = life.light === "rojo" ? "Cambia: ya no es seguro para el día a día." : "Cambia: se te queda corto para lo que haces.";
  } else if (life.light === "amarillo" || (!life.appleSilicon && life.yearsLeft < 2)) {
    kind = "planifica";
    headline = `Aguanta, pero planifica el cambio antes de ${Math.floor(life.securityEnd)}.`;
  } else {
    kind = "espera";
    headline = `No cambies: te quedan ≈ ${years} ${years === 1 ? "año" : "años"} de soporte y te sobra para lo que haces.`;
    if (shortTier || shortSsd) headline = `No cambies todavía: te quedan ≈ ${years} años de soporte. Tiene algún límite, pero no justifica gastar.`;
  }
  const params = new URLSearchParams({ modo: "normal" });
  return {
    kind,
    headline,
    reasons,
    life,
    valueNow,
    valueNextYear,
    waitingCostPerYear,
    recommendHref: `/recomendar?${params.toString()}`,
  };
}
