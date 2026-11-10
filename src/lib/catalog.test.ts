import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../data/catalog.json";
import type { CatalogFile, FamilyId } from "./types";

const file = catalog as CatalogFile;

test("el catálogo cubre Intel antiguo y Apple Silicon hasta M6", () => {
  assert.ok(file.items.length > 350);
  const chips = new Set(file.items.map((item) => item.chip));
  for (const chip of ["M1", "M2", "M3", "M4", "M5", "M6", "M5 Pro", "M5 Max", "M5 Ultra"]) {
    assert.ok(chips.has(chip), chip);
  }
  const families = new Set(file.items.map((item) => item.family));
  const expected: FamilyId[] = ["macbook-air", "macbook-pro", "macbook", "macbook-neo", "mac-mini", "imac", "mac-studio", "mac-pro"];
  for (const family of expected) {
    assert.ok(families.has(family), family);
  }
  assert.ok(file.items.some((item) => item.year <= 2008 && item.priceConfidence === "dataset"));
  assert.ok(file.items.some((item) => item.id === "mbp-14-m6-2026" && item.launchPriceEUR === 2329));
  assert.ok(file.items.some((item) => item.id === "mbn-13-a18-2026" && item.launchPriceEUR === 699));
  assert.ok(file.items.some((item) => item.id === "mini-m6-2026"));
  assert.ok(file.items.some((item) => item.id === "studio-m5ultra-2026"));
  const unpriced = file.items.filter((item) => item.basePriceEUR == null);
  assert.ok(unpriced.every((item) => item.priceSource.length > 20));
});

test("el MacBook Pro 13 de 2017 conserva el precio del CSV", () => {
  const item = file.items.find(
    (entry) => entry.year === 2017 && entry.family === "macbook-pro" && entry.screenInches === 13.3 && entry.cpu.includes("2,3"),
  );
  assert.ok(item);
  assert.equal(item?.basePriceEUR, 1505);
  assert.equal(item?.formula, "macbook-pro");
  assert.equal(item?.ramGB, 8);
});
