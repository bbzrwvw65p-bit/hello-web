import assert from "node:assert/strict";
import test from "node:test";
import { getCatalog } from "./catalog";
import { candidatesFor, detect, headline, isMacUserAgent, matchScreen, parseRenderer, type Signals } from "./detect";
import { isAppleSilicon } from "./market";

const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const WIN_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const base: Signals = { userAgent: MAC_SAFARI, platform: null, maxTouchPoints: 0, renderer: "Apple GPU", screenWidth: 1512, screenHeight: 982, devicePixelRatio: 2 };
const catalog = getCatalog();

test("sistema: Mac sí, iPad que se hace pasar por Mac no, Windows no", () => {
  assert.equal(isMacUserAgent(MAC_SAFARI, 0), true);
  assert.equal(isMacUserAgent(MAC_SAFARI, 5), false);
  assert.equal(isMacUserAgent(WIN_CHROME, 0), false);
  assert.equal(isMacUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)", 5), false);
});

test("gráfica: Chrome da el chip, Safari no distingue, Firefox redondea, Intel se reconoce", () => {
  assert.deepEqual(parseRenderer("ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"), { arch: "apple", chip: "M2 Pro" });
  assert.deepEqual(parseRenderer("Apple M4"), { arch: "apple", chip: "M4" });
  assert.deepEqual(parseRenderer("Apple GPU"), { arch: "desconocido", chip: null });
  assert.deepEqual(parseRenderer("Apple M1, or similar"), { arch: "apple", chip: null });
  assert.equal(parseRenderer("ANGLE (Intel Inc., Intel(R) Iris(TM) Plus Graphics 655, OpenGL 4.1)").arch, "intel");
  assert.equal(parseRenderer("ANGLE (ATI Technologies Inc., AMD Radeon Pro 5500M OpenGL Engine, OpenGL 4.1)").arch, "intel");
  assert.equal(parseRenderer(null).arch, "desconocido");
});

test("pantalla: resoluciones por defecto, en cualquier orientación; 1× no cuenta", () => {
  assert.equal(matchScreen(1512, 982, 2)?.id, "mbp14");
  assert.equal(matchScreen(982, 1512, 2)?.id, "mbp14");
  assert.equal(matchScreen(1728, 1117, 2)?.id, "mbp16");
  assert.equal(matchScreen(1470, 956, 2)?.id, "mba13n");
  assert.equal(matchScreen(1440, 900, 2)?.id, "m13");
  assert.equal(matchScreen(1920, 1080, 1), null);
  assert.equal(matchScreen(2560, 1440, 1), null);
});

test("Safari en un MacBook Pro 14″: chip de Apple por la pantalla, tres candidatos de 14″ y generaciones distintas", () => {
  const d = detect(base);
  assert.equal(d.isMac, true);
  assert.equal(d.arch, "apple");
  const c = candidatesFor(d, catalog, 2026);
  assert.equal(c.length, 3);
  assert.deepEqual(c.map((x) => x.likelihood), ["Más probable", "Probable", "Posible"]);
  for (const x of c) {
    assert.equal(x.item.family, "macbook-pro");
    assert.ok(x.item.screenInches > 14 && x.item.screenInches < 14.5);
    assert.ok(isAppleSilicon(x.item));
  }
  assert.equal(new Set(c.map((x) => x.item.chip.match(/^M\d+/)?.[0])).size, 3);
  assert.equal(headline(d, c), "Parece que usas un MacBook Pro 14″ con chip de Apple. ¿Es alguno de estos?");
});

test("Chrome que dice «Apple M2 Pro» en un 16″: un único candidato exacto", () => {
  const d = detect({ ...base, userAgent: MAC_CHROME, renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)", screenWidth: 1728, screenHeight: 1117 });
  const c = candidatesFor(d, catalog, 2026);
  assert.equal(c.length, 1);
  assert.equal(c[0].item.chip, "M2 Pro");
  assert.ok(c[0].item.screenInches > 16);
  assert.match(headline(d, c) ?? "", /MacBook Pro 16″ con chip M2 Pro\. ¿Es este\?/);
});

test("Intel a 1440×900: solo modelos Intel de 13″", () => {
  const d = detect({ ...base, userAgent: MAC_CHROME, renderer: "ANGLE (Intel Inc., Intel(R) Iris(TM) Plus Graphics 645, OpenGL 4.1)", screenWidth: 1440, screenHeight: 900 });
  assert.equal(d.arch, "intel");
  const c = candidatesFor(d, catalog, 2026);
  assert.ok(c.length >= 1);
  for (const x of c) assert.equal(isAppleSilicon(x.item), false);
});

test("con monitor externo y sin chip exacto no se propone nada; en Windows tampoco", () => {
  assert.deepEqual(candidatesFor(detect({ ...base, screenWidth: 2560, screenHeight: 1440, devicePixelRatio: 1 }), catalog, 2026), []);
  assert.deepEqual(candidatesFor(detect({ ...base, userAgent: WIN_CHROME }), catalog, 2026), []);
  assert.equal(headline(detect({ ...base, userAgent: WIN_CHROME }), []), null);
});
