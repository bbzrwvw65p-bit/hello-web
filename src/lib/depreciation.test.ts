import assert from "node:assert/strict";
import test from "node:test";
import { ageYears } from "./depreciation";
import { recommend } from "./recommend";
import type { CatalogItem } from "./types";

test("la edad usa meses de calendario", () => {
  assert.equal(ageYears(2017, 6, new Date(Date.UTC(2019, 5, 15))), 2);
});

function fixture(partial: Partial<CatalogItem> & Pick<CatalogItem, "id" | "family" | "launchPriceEUR">): CatalogItem {
  return {
    formFactor: "portable",
    name: "MacBook Air",
    sizeLabel: "13″",
    screenInches: 13.6,
    generation: "2026",
    year: 2026,
    month: 3,
    cpu: "M5",
    chip: "M5",
    gpu: null,
    identifier: null,
    modelNumber: null,
    ramGB: 16,
    ramOptions: [{ gb: 16, priceEUR: 0 }],
    storageKind: "ssd",
    storageGB: 512,
    storageLabel: "512 GB SSD",
    storageOptions: [{ gb: 512, kind: "ssd", label: "512 GB SSD", priceEUR: 0 }],
    basePriceEUR: partial.launchPriceEUR,
    priceBasis: "launch",
    priceConfidence: "alta",
    priceSource: "test",
    extraRamFinal: false,
    extraStorageFinal: false,
    formula: "macbook-air",
    upgradable: false,
    ports: "few",
    usbC: true,
    builtInUhd: true,
    drivesUhd: true,
    weight: "light",
    availability: "current",
    colors: [],
    capMode: "configured",
    ...partial,
  };
}

test("el recomendador respeta el presupuesto", () => {
  const items = [
    fixture({ id: "air", family: "macbook-air", launchPriceEUR: 1199, weight: "light" }),
    fixture({
      id: "pro",
      family: "macbook-pro",
      name: "MacBook Pro",
      launchPriceEUR: 2549,
      weight: "standard",
      ports: "many",
      chip: "M5 Pro",
      formula: "macbook-pro",
      year: 2026,
    }),
  ];
  const result = recommend(
    items,
    {
      formFactor: "portable",
      mobility: "light",
      desktopUse: "aio",
      bigScreen: "unsure",
      uhd: "unsure",
      manyPorts: "no",
      usbC: "unsure",
      condition: "new",
      profile: "personal",
      budget: 1500,
    },
    new Date(Date.UTC(2026, 10, 2)),
  );
  assert.ok(result.suggestions.every((suggestion) => suggestion.priceEUR <= 1500));
  assert.equal(result.suggestions[0]?.item.id, "air");
});
