import assert from "node:assert/strict";
import test from "node:test";
import { getCatalog, getItem } from "./catalog";
import { intelLastMacOS, lifecycle, macosLabel } from "./lifecycle";
import { isAppleSilicon } from "./market";

const NOW = new Date(Date.UTC(2026, 10, 10));

test("macOS 27 solo para chips de Apple: todos los M y el Neo lo reciben", () => {
  for (const item of getCatalog().filter(isAppleSilicon)) {
    const life = lifecycle(item, NOW);
    assert.equal(life.receivesCurrent, true, item.id);
    assert.equal(life.appleIntelligence, true, item.id);
    assert.equal(life.light, "verde", item.id);
  }
});

test("los cuatro Intel de Tahoe se quedan en macOS 26 con parches hasta ≈ 2028", () => {
  for (const id of ["mbp-13-2020-4ports"]) {
    const item = getItem(id);
    assert.ok(item);
    const life = lifecycle(item, NOW);
    assert.equal(life.latestVersion, 26);
    assert.equal(life.receivesCurrent, false);
    assert.equal(life.appleIntelligence, false);
    assert.equal(life.light, "amarillo");
  }
  const mbp16 = getCatalog().find((item) => item.family === "macbook-pro" && item.year === 2019 && item.screenInches >= 16);
  assert.ok(mbp16);
  assert.equal(intelLastMacOS(mbp16), 26);
  const imac27 = getCatalog().find((item) => item.family === "imac" && item.year === 2020 && item.screenInches >= 26);
  if (imac27) assert.equal(intelLastMacOS(imac27), 26);
});

test("tabla Intel: MacBook Air 2017 → Monterey, MBP 2017 → Ventura, MBP 2018 → Sequoia, Air 2018 → Sonoma", () => {
  const find = (family: string, year: number) => getCatalog().find((item) => item.family === family && item.year === year && !isAppleSilicon(item));
  assert.equal(intelLastMacOS(find("macbook-air", 2017)!), 12);
  assert.equal(intelLastMacOS(find("macbook-pro", 2017)!), 13);
  assert.equal(intelLastMacOS(find("macbook-pro", 2018)!), 15);
  assert.equal(intelLastMacOS(find("macbook-air", 2018)!), 14);
  assert.equal(lifecycle(find("macbook-air", 2018)!, NOW).light, "rojo");
});

test("estimaciones para chips de Apple: M1 2020 → última grande ≈ 2027 (macOS 28), parches ≈ 2029", () => {
  const m1 = getItem("mba-13-m1-2020");
  assert.ok(m1);
  const life = lifecycle(m1, NOW);
  assert.equal(life.lastMajorYear, 2027);
  assert.equal(life.lastMajorVersion, 28);
  assert.equal(Math.floor(life.securityEnd), 2029);
  assert.equal(life.lastMajorEstimated, true);
});

test("etiquetas de versión", () => {
  assert.equal(macosLabel(27), "macOS 27 Golden Gate");
  assert.equal(macosLabel(10.15), "macOS Catalina (10,15)");
});
