import assert from "node:assert/strict";
import test from "node:test";
import observationsFile from "@/data/market/observations.json";
import { getCatalog } from "./catalog";
import { DEFAULT_STATE, marketValue, type MachineState, type Observation } from "./market";
import type { CatalogItem, StorageOption } from "./types";

const AS_OF = new Date(Date.UTC(2026, 10, 2));
const observations = (observationsFile as { observations: Observation[] }).observations;

function storageAt(item: CatalogItem, index = 0): StorageOption {
  return item.storageOptions[index] ?? item.storageOptions[0];
}

function quote(item: CatalogItem, patch: Partial<MachineState> = {}, ram = item.ramGB, storage = storageAt(item)) {
  return marketValue(item, ram, storage, { ...DEFAULT_STATE, ...patch }, AS_OF);
}

test("el dataset trae precios reales con fecha", () => {
  assert.ok(observations.length >= 60);
  const air = observations.find(
    (row) => row.family === "macbook-air" && row.chip === "M5" && row.ramGB === 16 && row.storageGB === 512 && row.screenInches === 13,
  );
  assert.ok(air && air.priceEUR > 0);
  assert.match(air?.observedOn ?? "", /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(air?.source, "Apple Reacondicionado");
  const neo = observations.find((row) => row.family === "macbook-neo" && row.storageGB === 256);
  assert.ok(neo && neo.priceEUR > 0);
});

test("los anclajes observados caen dentro de una tolerancia del 12%", () => {
  const catalog = getCatalog();
  const checks: { id: string; ram: number; storageGB: number; observed: number }[] = [
    { id: "mba-13-m5-2026", ram: 16, storageGB: 512, observed: 1209 },
    { id: "mba-15-m5-2026", ram: 16, storageGB: 512, observed: 1459 },
    { id: "mbn-13-a18-2026", ram: 8, storageGB: 256, observed: 679 },
    { id: "imac-24-m4-2024", ram: 16, storageGB: 256, observed: 1439 },
    { id: "mbp-16-m4pro-2024", ram: 24, storageGB: 512, observed: 2539 },
  ];
  for (const check of checks) {
    const item = catalog.find((entry) => entry.id === check.id);
    assert.ok(item, check.id);
    const option = item.storageOptions.find((entry) => entry.gb === check.storageGB) ?? storageAt(item);
    const value = marketValue(item, check.ram, option, DEFAULT_STATE, AS_OF);
    assert.ok(value, check.id);
    const ratio = value.refurbishedBuy.typical / check.observed;
    assert.ok(ratio > 0.88 && ratio < 1.12, `${check.id} ${value.refurbishedBuy.typical} vs ${check.observed}`);
  }
});

test("más memoria, más disco y mejor estado valen más en todo el catálogo", () => {
  const catalog = getCatalog();
  let checked = 0;
  for (const item of catalog) {
    const base = quote(item);
    if (!base) continue;
    checked += 1;
    for (const channel of [base.privateSell, base.buyback, base.refurbishedBuy]) {
      assert.ok(Number.isFinite(channel.typical), item.id);
      assert.ok(channel.typical >= 40, item.id);
      assert.ok(channel.low <= channel.typical && channel.typical <= channel.high, item.id);
      const ceiling = (item.launchPriceEUR ?? item.basePriceEUR ?? channel.typical) * 3.2;
      assert.ok(channel.high < ceiling, `${item.id} ${channel.high}`);
    }
    assert.ok(base.buyback.typical <= base.privateSell.typical + 1, item.id);
    assert.ok(base.privateSell.typical <= base.refurbishedBuy.typical * 1.2 || item.availability === "preorder", item.id);

    const rams = [...new Set(item.ramOptions.map((option) => option.gb))].sort((a, b) => a - b);
    if (rams.length >= 2) {
      const low = quote(item, {}, rams[0]);
      const high = quote(item, {}, rams[rams.length - 1]);
      assert.ok(low && high && high.privateSell.typical >= low.privateSell.typical, item.id);
    }
    const disks = item.storageOptions.filter((option) => option.gb).sort((a, b) => (a.gb ?? 0) - (b.gb ?? 0));
    if (disks.length >= 2 && disks[0].kind === disks[disks.length - 1].kind) {
      const small = quote(item, {}, item.ramGB, disks[0]);
      const big = quote(item, {}, item.ramGB, disks[disks.length - 1]);
      assert.ok(small && big && big.privateSell.typical >= small.privateSell.typical, item.id);
    }
    if (item.formFactor === "portable" && item.availability !== "preorder") {
      const fresh = quote(item, { grade: "como-nuevo", batteryHealth: 100 });
      const worn = quote(item, { grade: "aceptable", batteryHealth: 75, defects: ["golpes"] });
      assert.ok(fresh && worn && fresh.privateSell.typical > worn.privateSell.typical, item.id);
    }
  }
  assert.ok(checked > 350);
});

test("un Air M5 retiene más que un Air M1, y el M5 vale más", () => {
  const catalog = getCatalog();
  const m5 = catalog.find((item) => item.id === "mba-13-m5-2026");
  const m1 = catalog.find((item) => item.id === "mba-13-m1-2020");
  assert.ok(m5 && m1);
  const newAir = quote(m5);
  const oldAir = quote(m1);
  assert.ok(newAir && oldAir);
  assert.ok(newAir.retention > oldAir.retention);
  assert.ok(newAir.privateSell.typical > oldAir.privateSell.typical);
  assert.ok(oldAir.privateSell.typical > 350 && oldAir.privateSell.typical < 900);
});

test("el teclado de mariposa y el fin de soporte bajan el precio", () => {
  const catalog = getCatalog();
  const butterfly = catalog.find((item) => item.family === "macbook-pro" && item.year === 2017 && item.screenInches === 13.3);
  const fixed = catalog.find((item) => item.id === "mbp-16-2019-i7");
  assert.ok(butterfly && fixed);
  const bad = quote(butterfly);
  const better = quote(fixed);
  assert.ok(bad && better);
  assert.ok(bad.retention < better.retention);
  assert.ok(bad.notes.some((note) => note.includes("mariposa")));
});

test("un anuncio en vivo recalibra el reacondicionado", () => {
  const item = getCatalog().find((entry) => entry.id === "mba-13-m5-2026");
  assert.ok(item);
  const storage = item.storageOptions.find((option) => option.gb === 512) ?? storageAt(item);
  const live = observations
    .filter((row) => row.family === "macbook-air" && row.chip === "M5" && row.ramGB === 16 && row.storageGB === 512 && row.screenInches === 13)
    .map((row) => ({ ...row, priceEUR: 1000 }));
  assert.ok(live.length >= 2);
  const before = marketValue(item, 16, storage, DEFAULT_STATE, AS_OF);
  const after = marketValue(item, 16, storage, DEFAULT_STATE, AS_OF, live);
  assert.ok(before && after);
  assert.equal(after.recalibrated, true);
  assert.ok(after.refurbishedBuy.typical < before.refurbishedBuy.typical);
});

test("los Intel con «m3», «m5» o «M3» en el chip no pasan por Apple silicon", async () => {
  const { supportLevel, isAppleSilicon } = await import("./market");
  const catalog = getCatalog();
  const mislabelled = catalog.filter((item) => item.year < 2020 && /^m\d/i.test(item.chip));
  assert.ok(mislabelled.length >= 10);
  for (const item of mislabelled) {
    assert.equal(isAppleSilicon(item), false, item.id);
    assert.notEqual(supportLevel(item), "full", item.id);
    const value = quote(item);
    assert.ok(value && value.privateSell.typical < 450, `${item.id} ${value?.privateSell.typical}`);
  }
});

test("un Apple silicon de hace años no vale más que una parte de su sucesor nuevo", () => {
  const catalog = getCatalog();
  const byId = (id: string) => catalog.find((item) => item.id === id) as CatalogItem;
  const m2 = quote(byId("mba-13-m2-2022"));
  const m1 = quote(byId("mba-13-m1-2020"));
  const m1pro = quote(byId("mbp-14-m1pro-2021"));
  assert.ok(m2 && m1 && m1pro);
  assert.ok(m2.privateSell.typical > 380 && m2.privateSell.typical < 650, String(m2.privateSell.typical));
  assert.ok(m1.privateSell.typical > 330 && m1.privateSell.typical < m2.privateSell.typical, String(m1.privateSell.typical));
  assert.ok(m1pro.privateSell.typical > 800 && m1pro.privateSell.typical < 1300, String(m1pro.privateSell.typical));
  assert.ok(m2.notes.some((note) => note.includes("generaciones")));
});

test("sin PVP contrastado, tasa con anuncios iguales o con el hermano más cercano", () => {
  const catalog = getCatalog();
  const max = catalog.find((item) => item.id === "mbp-14-m4max-2024") as CatalogItem;
  const m3pro = catalog.find((item) => item.id === "mbp-14-m3pro-2023") as CatalogItem;
  const withAds = quote(max);
  const sibling = quote(m3pro);
  assert.ok(withAds && withAds.comparableCount >= 1);
  assert.ok(sibling && sibling.confidence === "baja");
  assert.ok(sibling.notes.some((note) => note.includes("PVP español")));
});

test("bloqueo de iCloud, cargador, factura y batería mueven la cifra y viajan en la URL", async () => {
  const { parseState, stateQuery } = await import("./market");
  const item = getCatalog().find((entry) => entry.id === "mba-13-m4-2025") as CatalogItem;
  const base = quote(item);
  const locked = quote(item, { defects: ["bloqueo"] });
  const bare = quote(item, { charger: false, invoice: false, batteryHealth: null });
  assert.ok(base && locked && bare);
  assert.ok(locked.privateSell.typical < base.privateSell.typical * 0.35);
  assert.ok(bare.privateSell.typical < base.privateSell.typical);
  const state: MachineState = { ...DEFAULT_STATE, batteryHealth: null, charger: false, invoice: false, defects: ["marcas", "puertos"] };
  const back = parseState(new URLSearchParams(stateQuery(state)));
  assert.deepEqual(back, state);
});
