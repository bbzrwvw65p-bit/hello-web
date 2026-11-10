import assert from "node:assert/strict";
import test from "node:test";
import { matchRefurbs, memoryGb, parseRefurbHtml, quoteFrom, storageGb } from "./prices/refurb";

const html = `
<script type="application/ld+json">{"@type":"Product","name":"MacBook Air reacondicionado de 13 pulgadas con chip M1","description":"8 GB de memoria unificada\\nSSD de 256 GB","url":"https://www.apple.com/es/shop/product/a","offers":[{"price":549,"sku":"A"}]}</script>
<script type="application/ld+json">{"@type":"Product","name":"MacBook Air reacondicionado de 13 pulgadas con chip M1","description":"16 GB de memoria unificada\\nSSD de 512 GB","url":"https://www.apple.com/es/shop/product/b","offers":[{"price":729,"sku":"B"}]}</script>
<script type="application/ld+json">{"@type":"Product","name":"MacBook Pro reacondicionado de 14 pulgadas con chip M5 Pro","description":"24 GB de memoria unificada\\nSSD de 1 TB","url":"https://www.apple.com/es/shop/product/c","offers":[{"price":2400,"sku":"C"}]}</script>
`;

test("lee el JSON-LD de Apple Reacondicionado", () => {
  const products = parseRefurbHtml(html);
  assert.equal(products.length, 3);
  assert.equal(memoryGb(products[0].description), 8);
  assert.equal(storageGb(products[1].description), 512);
  assert.equal(storageGb("SSD de 1 TB"), 1024);
});

test("acota por chip, tamaño, RAM y disco", () => {
  const products = parseRefurbHtml(html);
  const strict = matchRefurbs(products, {
    family: "macbook-air",
    chip: "M1",
    screenInches: 13.3,
    ramGB: 8,
    storageGB: 256,
  });
  assert.equal(strict.relaxed, false);
  assert.equal(strict.products.length, 1);
  assert.equal(strict.products[0].price, 549);

  const near = matchRefurbs(products, {
    family: "macbook-air",
    chip: "M1",
    screenInches: 13.3,
    ramGB: 32,
    storageGB: 256,
  });
  assert.equal(near.relaxed, true);
  assert.equal(near.products.length, 2);

  const pro = matchRefurbs(products, {
    family: "macbook-pro",
    chip: "M5",
    screenInches: 14.2,
    ramGB: 16,
    storageGB: 512,
  });
  assert.equal(pro.products.length, 0);

  const vague = matchRefurbs(
    [
      ...products,
      {
        name: "MacBook Air reacondicionado de 13 pulgadas con chip M1",
        description: "Texto comercial sin capacidad.",
        price: 999,
        url: "https://www.apple.com/es/shop/product/z",
        sku: "Z",
      },
    ],
    { family: "macbook-air", chip: "M1", screenInches: 13.3, ramGB: 8, storageGB: 256 },
  );
  assert.equal(vague.relaxed, false);
  assert.ok(vague.products.every((product) => product.price !== 999));
});

test("la mediana sale del grupo que encaja", () => {
  const products = parseRefurbHtml(html);
  const matched = matchRefurbs(products, {
    family: "macbook-air",
    chip: "M1",
    screenInches: 13.3,
    ramGB: 8,
    storageGB: 256,
  });
  const quote = quoteFrom(matched.products, matched.relaxed, "2026-11-02T08:00:00.000Z");
  assert.equal(quote?.median, 549);
  assert.equal(quote?.source, "Apple Reacondicionado");
  assert.equal(quote?.kind, "reacondicionado");
});
