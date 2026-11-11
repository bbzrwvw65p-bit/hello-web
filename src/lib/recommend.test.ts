import assert from "node:assert/strict";
import test from "node:test";
import { getCatalog } from "./catalog";
import { supportLevel } from "./market";
import { dropCloseOrDominated, isDominated, offerDifference, priceGap, recommend, type Suggestion, type SuggestionRole } from "./recommend";
import type { CatalogItem, RecommendAnswers } from "./types";

const AS_OF = new Date(Date.UTC(2026, 10, 2));
const catalog = getCatalog();

function answers(partial: Partial<RecommendAnswers> = {}): RecommendAnswers {
  return {
    formFactor: "portable",
    mobility: "unsure",
    desktopUse: "aio",
    bigScreen: "unsure",
    uhd: "unsure",
    manyPorts: "no",
    usbC: "unsure",
    condition: "new",
    profile: "personal",
    budget: 1200,
    ...partial,
  };
}

function fake(item: CatalogItem, priceEUR: number, score: number, role: SuggestionRole = "encaja"): Suggestion {
  return {
    role,
    roleTitle: role,
    item,
    ramGB: item.ramGB,
    storageIndex: 0,
    priceEUR,
    priceKind: "nuevo",
    priceSource: "test",
    priceDate: "nov 2026",
    configLabel: "test",
    why: "por qué concreto de esta configuración",
    tradeoff: "la contrapartida de esta opción",
    overBudgetEUR: 0,
    newPriceEUR: item.launchPriceEUR,
    score,
  };
}

function assertHealthy(list: Suggestion[]) {
  assert.ok(list.length <= 3);
  for (const suggestion of list) {
    assert.equal(supportLevel(suggestion.item), "full", suggestion.item.id);
    assert.notEqual(suggestion.item.family, "macbook", suggestion.item.id);
    assert.ok(suggestion.priceEUR > 0, suggestion.item.id);
    assert.ok(suggestion.why.length > 20, suggestion.item.id);
    assert.ok(suggestion.tradeoff.length > 10, suggestion.item.id);
  }
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (priceGap(a.priceEUR, b.priceEUR) < 0.1) {
        assert.ok(
          offerDifference(a, b),
          `${a.item.id} a ${a.priceEUR} € y ${b.item.id} a ${b.priceEUR} € quedan a menos del 10% sin diferencia relevante`,
        );
      }
      assert.equal(isDominated(a, b), false, `${a.item.id} está dominado por ${b.item.id}`);
      assert.equal(isDominated(b, a), false, `${b.item.id} está dominado por ${a.item.id}`);
    }
  }
}

test("estudiante 900, oficina ligera 1200 y vídeo 2500 salen diferenciados", () => {
  const student = recommend(catalog, answers({ mobility: "light", bigScreen: "no", budget: 900 }), AS_OF);
  assertHealthy(student.suggestions);
  assert.equal(student.suggestions[0]?.item.id, "mbn-13-a18-2026");
  assert.equal(student.suggestions[0]?.priceEUR, 699);
  assert.equal(student.suggestions[0]?.priceKind, "nuevo");
  const step = student.suggestions.find((suggestion) => suggestion.role === "superior");
  assert.equal(step?.item.id, "mba-13-m5-2026");
  assert.equal(step?.priceEUR, 1199);
  assert.ok(student.suggestions.every((suggestion) => suggestion.item.year >= 2024));

  const office = recommend(catalog, answers({ mobility: "light", bigScreen: "no", budget: 1200 }), AS_OF);
  assertHealthy(office.suggestions);
  assert.equal(office.suggestions[0]?.item.id, "mba-13-m5-2026");
  assert.equal(office.suggestions[0]?.priceEUR, 1199);
  const saving = office.suggestions.find((suggestion) => suggestion.role === "ahorro");
  assert.equal(saving?.item.id, "mbn-13-a18-2026");
  assert.equal(saving?.priceEUR, 679);
  assert.equal(saving?.priceKind, "reacondicionado");
  assert.ok(saving && saving.priceEUR <= 1199 * 0.85);

  const video = recommend(
    catalog,
    answers({ mobility: "power", bigScreen: "unsure", budget: 2500, profile: "pro", manyPorts: "yes", uhd: "yes" }),
    AS_OF,
  );
  assertHealthy(video.suggestions);
  assert.equal(video.suggestions[0]?.item.id, "mbp-14-m5pro-2026");
  assert.equal(video.suggestions[0]?.priceEUR, 2549);
  assert.equal(video.suggestions.find((suggestion) => suggestion.role === "ahorro")?.priceEUR, 2009);
  assert.equal(video.suggestions.find((suggestion) => suggestion.role === "superior")?.item.id, "mbp-16-m5pro-2026");
  assert.equal(video.suggestions.find((suggestion) => suggestion.role === "superior")?.priceEUR, 3049);
  assert.ok(video.suggestions.every((suggestion) => suggestion.item.family === "macbook-pro"));
});

test("un barrido no junta precios, no saca Intel y no deja un modelo dominado", () => {
  const budgets = [700, 900, 1200, 1800, 2500, 4000];
  const mobilities = ["light", "power", "unsure"] as const;
  const screens = ["yes", "no", "unsure"] as const;
  const conditions = ["new", "used", "any"] as const;
  const profiles = ["personal", "pro", "extreme"] as const;
  for (const budget of budgets) {
    for (const mobility of mobilities) {
      for (const bigScreen of screens) {
        for (const condition of conditions) {
          for (const profile of profiles) {
            const result = recommend(catalog, answers({ budget, mobility, bigScreen, condition, profile }), AS_OF);
            assertHealthy(result.suggestions);
          }
        }
      }
    }
  }
  const desk = recommend(catalog, answers({ formFactor: "desktop", desktopUse: "external", budget: 1200, condition: "new" }), AS_OF);
  assertHealthy(desk.suggestions);
  assert.ok(desk.suggestions.every((suggestion) => suggestion.item.family !== "imac"));
  const oldBook = catalog.find((item) => item.family === "macbook");
  assert.ok(oldBook);
  assert.notEqual(supportLevel(oldBook), "full");
});

test("dos precios a menos del 10% sin diferencia relevante no conviven", () => {
  const air = catalog.find((item) => item.id === "mba-13-m5-2026");
  assert.ok(air);
  const kept = dropCloseOrDominated([fake(air, 1199, 10), fake(air, 1280, 9)]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.priceEUR, 1199);
  assert.ok(priceGap(1199, 1280) < 0.1);
  assert.equal(offerDifference(fake(air, 1199, 1), fake(air, 1280, 1)), false);
});

test("un modelo peor y no más barato se descarta", () => {
  const neo = catalog.find((item) => item.id === "mbn-13-a18-2026");
  const air = catalog.find((item) => item.id === "mba-13-m5-2026");
  assert.ok(neo && air);
  assert.equal(isDominated({ item: neo, priceEUR: 800, ramGB: 8 }, { item: air, priceEUR: 790, ramGB: 16 }), true);
  const kept = dropCloseOrDominated([fake(neo, 800, 30, "ahorro"), fake(air, 790, 50, "encaja")]);
  assert.deepEqual(kept.map((suggestion) => suggestion.item.id), ["mba-13-m5-2026"]);
});

test("de segunda mano con poco presupuesto también propone algo, y a un profesional no le da 8 GB", () => {
  const cheap = recommend(catalog, answers({ condition: "used", budget: 500 }), AS_OF);
  assertHealthy(cheap.suggestions);
  assert.ok(cheap.suggestions.length >= 1);
  assert.ok(cheap.suggestions.every((suggestion) => suggestion.priceEUR <= 500 * 1.08));
  assert.ok(cheap.suggestions.some((suggestion) => suggestion.priceKind === "segunda-mano"));

  const fresh = recommend(catalog, answers({ condition: "new", budget: 1200 }), AS_OF);
  assert.ok(fresh.suggestions.every((suggestion) => suggestion.priceKind !== "segunda-mano"));

  for (const profile of ["pro", "extreme"] as const) {
    for (const condition of ["new", "used", "any"] as const) {
      const result = recommend(catalog, answers({ profile, condition, budget: 2000 }), AS_OF);
      assertHealthy(result.suggestions);
      assert.ok(result.suggestions.every((suggestion) => suggestion.ramGB >= 16), `${profile} ${condition}`);
      assert.ok(result.suggestions.every((suggestion) => suggestion.item.family !== "macbook-neo"));
    }
  }
  const heavy = recommend(catalog, answers({ profile: "extreme", budget: 3000 }), AS_OF);
  assert.ok(heavy.suggestions.every((suggestion) => /M\d+ (Pro|Max|Ultra)/.test(suggestion.item.chip)));
});

test("con HDMI y SD, un MacBook Pro gana si cabe en el presupuesto", () => {
  const result = recommend(catalog, answers({ profile: "pro", manyPorts: "yes", budget: 2000 }), AS_OF);
  assert.equal(result.suggestions[0]?.item.family, "macbook-pro");
});
