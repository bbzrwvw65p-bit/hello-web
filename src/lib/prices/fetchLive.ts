import { matchRefurbs, parseRefurbGrid, parseRefurbHtml, quoteFrom, type GridObservation, type LiveQuote, type RefurbProduct } from "./refurb";
import type { CatalogItem } from "../types";

const REFURB_URL = "https://www.apple.com/es/shop/refurbished/mac";
const TTL_MS = 1000 * 60 * 60 * 6;

type CacheBox = {
  refurb?: { at: number; products: RefurbProduct[]; grid: GridObservation[]; fetchedAt: string };
  ebayToken?: { at: number; token: string };
};

const globalCache = globalThis as typeof globalThis & { __helloPriceCache?: CacheBox };

function box(): CacheBox {
  if (!globalCache.__helloPriceCache) globalCache.__helloPriceCache = {};
  return globalCache.__helloPriceCache;
}

export type Attempt = { source: string; ok: boolean; detail: string };

async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "hello-mac/1.0 (tasacion de segunda mano; uso personal)",
      Accept: "text/html,application/json",
      "Accept-Language": "es-ES,es;q=0.9",
      ...(init.headers ?? {}),
    },
  });
}

export async function loadRefurbs(): Promise<{ products: RefurbProduct[]; grid: GridObservation[]; fetchedAt: string; error?: string }> {
  const cached = box().refurb;
  if (cached && Date.now() - cached.at < TTL_MS) {
    return { products: cached.products, grid: cached.grid, fetchedAt: cached.fetchedAt };
  }
  try {
    const response = await fetchText(REFURB_URL);
    if (!response.ok) {
      return {
        products: cached?.products ?? [],
        grid: cached?.grid ?? [],
        fetchedAt: cached?.fetchedAt ?? new Date().toISOString(),
        error: `HTTP ${response.status}`,
      };
    }
    const html = await response.text();
    const products = parseRefurbHtml(html);
    const grid = parseRefurbGrid(html, new Date().toISOString().slice(0, 10));
    const fetchedAt = new Date().toISOString();
    if (products.length || grid.length) box().refurb = { at: Date.now(), products, grid, fetchedAt };
    return { products, grid, fetchedAt, error: products.length || grid.length ? undefined : "La página no traía productos." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red";
    return {
      products: cached?.products ?? [],
      grid: cached?.grid ?? [],
      fetchedAt: cached?.fetchedAt ?? new Date().toISOString(),
      error: message,
    };
  }
}

async function ebayToken(): Promise<string | null> {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const cached = box().ebayToken;
  if (cached && Date.now() - cached.at < 1000 * 60 * 45) return cached.token;
  const response = await fetchText("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) return null;
  box().ebayToken = { at: Date.now(), token: payload.access_token };
  return payload.access_token;
}

function queryText(item: CatalogItem, ramGB: number, storageGB: number | null): string {
  const size = item.screenInches ? `${Math.round(item.screenInches)}` : "";
  const storage = storageGB ? (storageGB >= 1024 ? `${storageGB / 1024}TB` : `${storageGB}GB`) : "";
  return [item.name, size, item.chip, `${ramGB}GB`, storage].filter(Boolean).join(" ");
}

async function ebayQuote(item: CatalogItem, ramGB: number, storageGB: number | null): Promise<{ quote: LiveQuote | null; attempt: Attempt }> {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return {
      quote: null,
      attempt: {
        source: "eBay Browse API",
        ok: false,
        detail: "Sin EBAY_CLIENT_ID / EBAY_CLIENT_SECRET. La búsqueda de anuncios activos queda desactivada.",
      },
    };
  }
  try {
    const token = await ebayToken();
    if (!token) {
      return { quote: null, attempt: { source: "eBay.es", ok: false, detail: "No se obtuvo token OAuth." } };
    }
    const q = encodeURIComponent(queryText(item, ramGB, storageGB));
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&filter=buyingOptions:%7BFIXED_PRICE%7D&filter=itemLocationCountry:ES&limit=20&sort=price`;
    const response = await fetchText(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_ES",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return { quote: null, attempt: { source: "eBay.es", ok: false, detail: `HTTP ${response.status}` } };
    }
    const payload = (await response.json()) as {
      itemSummaries?: { price?: { value?: string; currency?: string }; itemWebUrl?: string; title?: string }[];
    };
    const prices = (payload.itemSummaries ?? [])
      .map((itemSummary) => Number(itemSummary.price?.value))
      .filter((price) => Number.isFinite(price) && price > 40);
    if (!prices.length) {
      return { quote: null, attempt: { source: "eBay.es", ok: false, detail: "Sin anuncios con precio en EUR." } };
    }
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
    const link = payload.itemSummaries?.find((itemSummary) => Number(itemSummary.price?.value) === median)?.itemWebUrl
      ?? `https://www.ebay.es/sch/i.html?_nkw=${q}`;
    return {
      quote: {
        source: "eBay.es",
        url: link,
        fetchedAt: new Date().toISOString(),
        median,
        low: prices[0],
        high: prices[prices.length - 1],
        sampleSize: prices.length,
        kind: "anuncios",
        region: "ES",
        relaxed: true,
        note: "Anuncios activos con compra inmediata, no ventas cerradas. El precio pedido no es el precio al que se cierra.",
      },
      attempt: { source: "eBay.es", ok: true, detail: `${prices.length} anuncios` },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red";
    return { quote: null, attempt: { source: "eBay.es", ok: false, detail: message } };
  }
}

function collectPrices(value: unknown, depth = 0, found: number[] = []): number[] {
  if (depth > 7 || found.length > 30) return found;
  if (Array.isArray(value)) {
    for (const entry of value) collectPrices(entry, depth + 1, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  const record = value as Record<string, unknown>;
  if (typeof record.price === "number") found.push(record.price);
  if (record.price && typeof record.price === "object") {
    const amount = (record.price as { amount?: unknown }).amount;
    if (typeof amount === "number") found.push(amount);
  }
  for (const nested of Object.values(record)) collectPrices(nested, depth + 1, found);
  return found;
}

function medianOf(prices: number[]): { median: number; low: number; high: number } {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { median, low: sorted[0], high: sorted[sorted.length - 1] };
}

async function wallapopQuote(query: string): Promise<{ quote: LiveQuote | null; attempt: Attempt }> {
  const url = `https://api.wallapop.com/api/v3/general/search?keywords=${encodeURIComponent(query)}&latitude=40.4168&longitude=-3.7038&order_by=newest`;
  try {
    const response = await fetchText(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return {
        quote: null,
        attempt: {
          source: "Wallapop",
          ok: false,
          detail: `HTTP ${response.status}. Wallapop no tiene una API pública documentada y desde muchos centros de datos responde 403. No se inicia sesión.`,
        },
      };
    }
    const prices = collectPrices(await response.json()).filter((price) => price >= 60 && price <= 20000);
    if (prices.length < 3) {
      return { quote: null, attempt: { source: "Wallapop", ok: false, detail: "La búsqueda respondió sin bastantes precios." } };
    }
    const stats = medianOf(prices);
    return {
      quote: {
        source: "Wallapop",
        url: `https://es.wallapop.com/search?keywords=${encodeURIComponent(query)}`,
        fetchedAt: new Date().toISOString(),
        ...stats,
        sampleSize: prices.length,
        kind: "anuncios",
        region: "ES",
        relaxed: true,
        note: "Anuncios activos en Wallapop alrededor de Madrid. El precio pedido no es el precio de cierre.",
      },
      attempt: { source: "Wallapop", ok: true, detail: `${prices.length} anuncios` },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red";
    return { quote: null, attempt: { source: "Wallapop", ok: false, detail: message } };
  }
}

async function backMarketAttempt(query: string): Promise<Attempt> {
  const url = `https://www.backmarket.es/es-es/search?q=${encodeURIComponent(query)}`;
  try {
    const response = await fetchText(url);
    if (!response.ok) {
      return {
        source: "Back Market",
        ok: false,
        detail: `HTTP ${response.status}. El buscador público corta las peticiones automatizadas (CloudFront). No hay API oficial de precios de segunda mano sin acuerdo comercial.`,
      };
    }
    return { source: "Back Market", ok: true, detail: "La búsqueda respondió. Revisa el enlace para el precio de esa configuración." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red";
    return { source: "Back Market", ok: false, detail: message };
  }
}

export async function fetchLivePrice(
  item: CatalogItem,
  ramGB: number,
  storageGB: number | null,
): Promise<{ quote: LiveQuote | null; attempts: Attempt[]; observations: GridObservation[] }> {
  const query = queryText(item, ramGB, storageGB);
  const [refurb, wallapop, backMarket, ebay] = await Promise.all([
    loadRefurbs(),
    wallapopQuote(query),
    backMarketAttempt(query),
    ebayQuote(item, ramGB, storageGB),
  ]);

  const attempts: Attempt[] = [];
  let appleQuote: LiveQuote | null = null;
  if (refurb.error && !refurb.products.length) {
    attempts.push({ source: "Apple Reacondicionado", ok: false, detail: refurb.error });
  } else {
    const matched = matchRefurbs(refurb.products, {
      family: item.family,
      chip: item.chip,
      screenInches: item.screenInches,
      ramGB,
      storageGB,
    });
    appleQuote = quoteFrom(matched.products, matched.relaxed, refurb.fetchedAt);
    attempts.push({
      source: "Apple Reacondicionado",
      ok: Boolean(appleQuote),
      detail: appleQuote ? `${appleQuote.sampleSize} equipos` : refurb.error ?? "Sin ese modelo en el escaparate de hoy.",
    });
  }
  attempts.push(wallapop.attempt, backMarket, ebay.attempt);

  const observations = refurb.grid;
  if (appleQuote && !appleQuote.relaxed) return { quote: appleQuote, attempts, observations };
  if (wallapop.quote) return { quote: wallapop.quote, attempts, observations };
  if (appleQuote) return { quote: appleQuote, attempts, observations };
  return { quote: ebay.quote, attempts, observations };
}
