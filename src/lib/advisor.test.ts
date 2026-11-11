import assert from "node:assert/strict";
import test from "node:test";
import { advise, DEFAULT_ANSWERS, type Answers } from "./advisor";
import { changeOrWait } from "./mimac";
import { getItem } from "./catalog";
import { trapsFor } from "./traps";

const AS_OF = new Date(Date.UTC(2026, 10, 2));
const run = (patch: Partial<Answers>) => advise({ ...DEFAULT_ANSWERS, ...patch }, AS_OF);

test("novato con 600 €: recomienda algo dentro del presupuesto, con chip de Apple y soporte", () => {
  const result = run({ mode: "novato", uses: ["basico"], load: "poco", budget: 600, flexible: false });
  assert.ok(result.primary);
  assert.ok(result.primary.priceEUR <= 600);
  assert.equal(result.primary.life.appleSilicon, true);
  assert.notEqual(result.primary.life.light, "rojo");
});

test("presupuesto muy bajo: puede salir un Intel, siempre con aviso", () => {
  const result = run({ mode: "novato", uses: ["basico"], load: "poco", budget: 350, flexible: false });
  if (result.primary && !result.primary.life.appleSilicon) assert.ok(result.intelWarning);
});

test("IA local 70B: al menos 64 GB y prefiere memoria rápida (Max o Ultra) dentro del presupuesto", () => {
  const result = run({ uses: ["ia"], aiSize: 70, form: "igual", budget: 3500 });
  assert.ok(result.primary);
  assert.ok(result.primary.ramGB >= 64);
  assert.match(result.primary.item.chip, /Max|Ultra|Pro/);
});

test("gamer serio: honestidad sobre el Mac", () => {
  const result = run({ uses: ["juegos"], gameHow: "windows", gameLevel: "serio", budget: 1500, form: "igual" });
  assert.ok(result.gaming);
  assert.match(result.gaming, /no es lo ideal/);
  assert.match(result.gaming, /antitrampas/);
});

test("ningún texto del resultado nombra tiendas ni enlaza a ningún sitio", () => {
  const result = run({ uses: ["programar"], docker: true, budget: 1600 });
  const text = JSON.stringify({ ...result, primary: null, alternatives: [], newRef: null, cheapestOutOfBudget: null });
  assert.doesNotMatch(text, /wallapop|milanuncios|back ?market|ebay|amazon|https?:/i);
});

test("experto: avisa si pide más de lo que su uso necesita", () => {
  const result = run({ mode: "experto", uses: ["basico"], expert: { gen: null, tier: "max", ram: 64, ssd: null, screen: null }, budget: 6000 });
  assert.ok(result.expertFlags.some((flag) => /sobra|mucho/.test(flag)));
});

test("la amortización castiga a un usado con poca vida", () => {
  const result = run({ uses: ["basico"], load: "poco", budget: 2000 });
  for (const offer of [result.primary, ...result.alternatives.map((alt) => alt.offer)]) {
    if (!offer) continue;
    assert.ok(offer.amort.perYear > 0);
    assert.ok(offer.amort.usableYears <= Math.max(0.5, offer.life.yearsLeft) + 0.01);
  }
});

test("¿cambiar o esperar?: un Air M2 de 16 GB para lo básico → no cambies", () => {
  const item = getItem("mba-13-m2-2022");
  assert.ok(item);
  const verdict = changeOrWait(item, 16, 0, ["basico"], {}, AS_OF);
  assert.equal(verdict.kind, "espera");
  assert.match(verdict.headline, /No cambies/);
});

test("trampas: 8 GB y el Air M1 con una sola pantalla externa", () => {
  const item = getItem("mba-13-m1-2020");
  assert.ok(item);
  const traps = trapsFor(item, 8, item.storageOptions[0], AS_OF).map((trap) => trap.text).join(" ");
  assert.match(traps, /8 GB se quedan cortos/);
  assert.match(traps, /una pantalla externa/);
  assert.match(traps, /256 GB no se amplían/);
});
