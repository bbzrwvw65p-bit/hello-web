export type RefurbProduct = {
  name: string;
  description: string;
  price: number;
  url: string;
  sku: string;
};

export type LiveQuote = {
  source: string;
  url: string;
  fetchedAt: string;
  median: number;
  low: number;
  high: number;
  sampleSize: number;
  kind: "reacondicionado" | "anuncios";
  region: "ES";
  relaxed: boolean;
  note: string;
};

const FAMILY_PHRASES: [string, string][] = [
  ["macbook-neo", "macbook neo"],
  ["macbook-air", "macbook air"],
  ["macbook-pro", "macbook pro"],
  ["macbook", "macbook"],
  ["mac-mini", "mac mini"],
  ["mac-studio", "mac studio"],
  ["imac", "imac"],
  ["mac-pro", "mac pro"],
];

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[″”"]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9+./ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectFamily(name: string): string | null {
  const text = normalize(name);
  for (const [family, phrase] of FAMILY_PHRASES) {
    if (text.includes(phrase)) return family;
  }
  return null;
}

function chipTokens(chip: string): string[] {
  const text = normalize(chip);
  if (text.includes("a18")) return ["a18 pro", "a18"];
  const match = text.match(/m\d(?: pro| max| ultra)?/);
  return match ? [match[0]] : [text];
}

function mentionsChip(text: string, chip: string): boolean {
  const [token] = chipTokens(chip);
  if (!token) return false;
  if (!text.includes(token)) return false;
  if (token === "m5" && /m5 (pro|max|ultra)/.test(text)) return false;
  if (token === "m4" && /m4 (pro|max)/.test(text)) return false;
  if (token === "m3" && /m3 (pro|max|ultra)/.test(text)) return false;
  if (token === "m2" && /m2 (pro|max|ultra)/.test(text)) return false;
  if (token === "m1" && /m1 (pro|max|ultra)/.test(text)) return false;
  return true;
}

function sizeMatches(text: string, inches: number): boolean {
  if (!inches) return !/\d{2}\s*pulgadas/.test(text);
  const found = text.match(/(\d{2}(?:[.,]\d+)?)\s*pulgadas/);
  if (!found) {
    const quoted = text.match(/\b(1[1-7]|2[0-7])\b/);
    if (!quoted) return true;
    return Math.abs(Number(quoted[1]) - inches) < 1.2;
  }
  return Math.abs(Number(found[1].replace(",", ".")) - inches) < 1.2;
}

export function memoryGb(description: string): number | null {
  const text = normalize(description);
  const match = text.match(/(\d+)\s*gb de memoria/) ?? text.match(/(\d+)\s*gb unified/);
  return match ? Number(match[1]) : null;
}

export function storageGb(description: string): number | null {
  const text = normalize(description);
  const tb = text.match(/ssd de\s*(\d+)\s*tb/) ?? text.match(/(\d+)\s*tb/);
  if (tb && /ssd|tb/.test(text)) {
    const value = Number(tb[1]);
    if (value <= 16) return value * 1024;
  }
  const gb = text.match(/ssd de\s*(\d+)\s*gb/) ?? text.match(/(\d+)\s*gb de ssd/);
  return gb ? Number(gb[1]) : null;
}

export function matchRefurbs(
  products: RefurbProduct[],
  query: { family: string; chip: string; screenInches: number; ramGB: number; storageGB: number | null },
): { products: RefurbProduct[]; relaxed: boolean } {
  const sameModel = products.filter((product) => {
    if (detectFamily(product.name) !== query.family) return false;
    const text = normalize(`${product.name} ${product.description}`);
    if (!mentionsChip(text, query.chip)) return false;
    return sizeMatches(text, query.screenInches);
  });
  const strict = sameModel.filter((product) => {
    const ram = memoryGb(product.description);
    const storage = storageGb(product.description);
    if (ram == null || ram !== query.ramGB) return false;
    if (query.storageGB != null && storage !== query.storageGB) return false;
    return true;
  });
  if (strict.length) return { products: strict, relaxed: false };
  return { products: sameModel, relaxed: true };
}

export function quoteFrom(products: RefurbProduct[], relaxed: boolean, fetchedAt: string): LiveQuote | null {
  if (!products.length) return null;
  const prices = products.map((product) => product.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
  const anchor = products.find((product) => product.price === median) ?? products[0];
  return {
    source: "Apple Reacondicionado",
    url: anchor.url,
    fetchedAt,
    median,
    low: prices[0],
    high: prices[prices.length - 1],
    sampleSize: prices.length,
    kind: "reacondicionado",
    region: "ES",
    relaxed,
    note: relaxed
      ? "No había esa RAM o ese disco exactos. La mediana mezcla otras configuraciones del mismo modelo."
      : "Precio de reacondicionado oficial en España, con garantía de Apple. Suele quedar por encima de Wallapop.",
  };
}

const FAMILY: Record<string, string> = {
  macbookair: "macbook-air",
  macbookpro: "macbook-pro",
  macbookneo: "macbook-neo",
  imac: "imac",
  macmini: "mac-mini",
  macstudio: "mac-studio",
  macpro: "mac-pro",
};

export type GridObservation = {
  id: string;
  observedOn: string;
  source: string;
  url: string;
  title: string;
  family: string;
  chip: string | null;
  year: number | null;
  screenInches: number | null;
  ramGB: number | null;
  storageGB: number | null;
  priceEUR: number;
};

function gbToken(token: unknown): number | null {
  const text = String(token ?? "").toLowerCase();
  const match = text.match(/(\d+)\s*(tb|gb)/);
  if (!match) return null;
  const number = Number(match[1]);
  return match[2] === "tb" ? number * 1024 : number;
}

export function parseRefurbGrid(html: string, observedOn: string): GridObservation[] {
  const match = html.match(/window\.REFURB_GRID_BOOTSTRAP = (\{.*?\});\s*<\/script>/);
  if (!match) return [];
  const grid = JSON.parse(match[1]) as {
    tiles: {
      partNumber: string;
      title: string;
      productDetailsUrl: string;
      filters: { dimensions: Record<string, string> };
      price: { currentPrice: { raw_amount: string } };
    }[];
  };
  const seen = new Set<string>();
  const rows: GridObservation[] = [];
  for (const tile of grid.tiles) {
    const dims = tile.filters.dimensions;
    const family = FAMILY[dims.refurbClearModel ?? ""];
    if (!family || seen.has(tile.partNumber)) continue;
    seen.add(tile.partNumber);
    const title = tile.title.replace(/\u00a0/g, " ");
    const chip = title.match(/A18\s*Pro|M\d(?:\s*(?:Pro|Max|Ultra))?/i)?.[0]?.replace(/\s+/g, " ") ?? null;
    const screen = dims.dimensionScreensize?.match(/\d+/)?.[0];
    let url = tile.productDetailsUrl.split("?")[0];
    if (url.startsWith("/")) url = `https://www.apple.com${url}`;
    rows.push({
      id: tile.partNumber,
      observedOn,
      source: "Apple Reacondicionado",
      url,
      title,
      family,
      chip,
      year: dims.dimensionRelYear ? Number(dims.dimensionRelYear) : null,
      screenInches: screen ? Number(screen) : null,
      ramGB: gbToken(dims.tsMemorySize),
      storageGB: gbToken(dims.dimensionCapacity),
      priceEUR: Number(tile.price.currentPrice.raw_amount),
    });
  }
  return rows;
}

export function parseRefurbHtml(html: string): RefurbProduct[] {
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  const products: RefurbProduct[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const json = block.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, "");
    try {
      const data = JSON.parse(json) as {
        "@type"?: string;
        name?: string;
        description?: string;
        url?: string;
        offers?: { price?: number; sku?: string } | { price?: number; sku?: string }[];
      };
      if (data["@type"] !== "Product" || !data.name) continue;
      const offers = Array.isArray(data.offers) ? data.offers : data.offers ? [data.offers] : [];
      for (const offer of offers) {
        if (typeof offer.price !== "number") continue;
        const key = `${offer.sku ?? data.url ?? data.name}:${offer.price}`;
        if (seen.has(key)) continue;
        seen.add(key);
        products.push({
          name: data.name,
          description: data.description ?? "",
          price: offer.price,
          url: data.url ?? "https://www.apple.com/es/shop/refurbished/mac",
          sku: offer.sku ?? "",
        });
      }
    } catch {
      continue;
    }
  }
  return products;
}
