import { isAppleSilicon } from "./market";
import type { CatalogItem } from "./types";

export type Tier = "base" | "pro" | "max" | "ultra";

export type Specs = {
  tier: Tier;
  weightKg: number | null;
  externalDisplays: number;
  externalNote: string | null;
  hdmi: boolean;
  sd: boolean;
  magsafe: boolean;
  ethernet: boolean;
  usbA: boolean;
  thunderbolt: number;
  promotion120: boolean;
  brightnessNits: number | null;
  xdr: boolean;
  nanoOption: boolean;
  fanless: boolean;
  batteryHours: number | null;
  screenLabel: string;
  portsLabel: string;
};

export function tierOf(item: CatalogItem): Tier {
  const chip = item.chip.toLowerCase();
  if (chip.includes("ultra")) return "ultra";
  if (chip.includes("max")) return "max";
  if (chip.includes("pro") && !chip.includes("a18")) return "pro";
  return "base";
}

function gen(item: CatalogItem): number {
  const match = item.chip.match(/^M(\d+)/);
  return match ? Number(match[1]) : 0;
}

/**
 * Fichas técnicas de Apple resumidas por línea. Pesos, pantallas externas y puertos son los
 * oficiales de cada modelo; en Intel se usan valores típicos por familia y tamaño.
 */
export function specsOf(item: CatalogItem): Specs {
  const tier = tierOf(item);
  const g = gen(item);
  const size = item.screenInches;
  const base: Specs = {
    tier,
    weightKg: null,
    externalDisplays: 1,
    externalNote: null,
    hdmi: false,
    sd: false,
    magsafe: false,
    ethernet: false,
    usbA: false,
    thunderbolt: item.usbC ? 2 : 0,
    promotion120: false,
    brightnessNits: null,
    xdr: false,
    nanoOption: false,
    fanless: false,
    batteryHours: null,
    screenLabel: size ? `${String(size).replace(".", ",")}″` : "Sin pantalla",
    portsLabel: "",
  };
  const s = base;
  if (isAppleSilicon(item)) {
    switch (item.family) {
      case "macbook-neo":
        Object.assign(s, { weightKg: 1.23, externalDisplays: 1, externalNote: "Una pantalla 4K a 60 Hz, solo por el puerto USB 3", thunderbolt: 0, brightnessNits: 500, fanless: true, batteryHours: 16 });
        s.portsLabel = "2 USB-C (uno es USB 2) y auriculares";
        break;
      case "macbook-air": {
        const big = size >= 15;
        Object.assign(s, {
          weightKg: big ? 1.51 : g === 1 ? 1.29 : 1.24,
          externalDisplays: g >= 4 ? 2 : 1,
          externalNote: g === 3 ? "Dos externas solo con la tapa cerrada" : g <= 2 ? "Solo una pantalla externa" : null,
          magsafe: g >= 2,
          brightnessNits: g === 1 ? 400 : 500,
          fanless: true,
          batteryHours: 18,
        });
        s.portsLabel = g >= 2 ? "2 Thunderbolt, MagSafe y auriculares" : "2 Thunderbolt y auriculares";
        break;
      }
      case "macbook-pro":
        if (size < 14) {
          Object.assign(s, { weightKg: 1.4, externalDisplays: 1, externalNote: "Solo una pantalla externa", brightnessNits: 500, batteryHours: 20 });
          s.portsLabel = "2 Thunderbolt y auriculares";
        } else {
          const big = size >= 16;
          const displays = tier === "max" ? 4 : tier === "pro" ? 2 : g >= 4 ? 2 : 1;
          Object.assign(s, {
            weightKg: big ? (g <= 1 ? 2.15 : 2.14) : tier === "max" ? 1.62 : g <= 2 ? 1.6 : 1.55,
            externalDisplays: displays,
            externalNote: displays === 1 ? "Solo una pantalla externa" : null,
            hdmi: true,
            sd: true,
            magsafe: true,
            thunderbolt: tier === "base" && g <= 3 ? 2 : 3,
            promotion120: true,
            brightnessNits: /proled/i.test(item.id) ? 1600 : 1000,
            xdr: true,
            nanoOption: item.year >= 2024,
            batteryHours: big ? 22 : g >= 4 ? 24 : 18,
          });
          s.portsLabel = `${s.thunderbolt} Thunderbolt, HDMI, lector SD, MagSafe`;
        }
        break;
      case "imac": {
        const four = item.ramOptions.length > 1 || g >= 4;
        Object.assign(s, { weightKg: 4.4, externalDisplays: g >= 4 ? 2 : 1, brightnessNits: 500, ethernet: four, nanoOption: g >= 4, thunderbolt: four ? 4 : 2 });
        s.portsLabel = four ? "4 USB-C/Thunderbolt, Ethernet en el cargador" : "2 Thunderbolt";
        break;
      }
      case "mac-mini": {
        const displays = tier === "pro" ? 3 : g >= 4 ? 3 : 2;
        Object.assign(s, { weightKg: g >= 4 ? 0.7 : 1.2, externalDisplays: displays, hdmi: true, ethernet: true, usbA: g < 4, thunderbolt: tier === "pro" ? 5 : g >= 4 ? 3 : 2 });
        s.portsLabel = g >= 4 ? "Thunderbolt delante y detrás, HDMI, Ethernet" : "2 Thunderbolt, 2 USB-A, HDMI, Ethernet";
        break;
      }
      case "mac-studio":
        Object.assign(s, { weightKg: tier === "ultra" ? 3.6 : 2.7, externalDisplays: tier === "ultra" && g >= 2 ? 8 : 5, hdmi: true, sd: true, ethernet: true, usbA: true, thunderbolt: tier === "ultra" ? 6 : 4 });
        s.portsLabel = "Thunderbolt, USB-A, HDMI, lector SD, Ethernet 10 Gb";
        break;
      case "mac-pro":
        Object.assign(s, { weightKg: 16.9, externalDisplays: 8, hdmi: true, ethernet: true, usbA: true, thunderbolt: 8 });
        s.portsLabel = "Torre con ranuras PCIe";
        break;
      default:
        break;
    }
  } else {
    const family = item.family;
    const modern = item.year >= 2016;
    if (family === "macbook-air") s.weightKg = size < 12 ? 1.08 : item.year >= 2018 ? 1.25 : 1.35;
    else if (family === "macbook-pro") s.weightKg = size >= 17 ? 2.99 : size >= 16 ? 2.0 : size >= 15 ? (modern ? 1.83 : 2.5) : modern ? 1.37 : 2.0;
    else if (family === "macbook") s.weightKg = size <= 12.5 ? 0.92 : 2.2;
    else if (family === "imac") s.weightKg = size >= 26 ? 9.4 : 5.5;
    else if (family === "mac-mini") s.weightKg = 1.3;
    else if (family === "mac-pro") s.weightKg = item.year === 2013 ? 5 : 18;
    s.externalDisplays = modern ? 2 : 1;
    s.hdmi = family === "mac-mini" || (family === "macbook-pro" && item.year >= 2012 && item.year <= 2015);
    s.sd = (family === "macbook-pro" && item.year >= 2009 && item.year <= 2015) || (family === "imac" && item.year >= 2009);
    s.magsafe = (family === "macbook-pro" || family === "macbook-air") && item.year <= 2015;
    s.ethernet = family !== "macbook-air" && family !== "macbook" && !(family === "macbook-pro" && item.year >= 2012);
    s.usbA = !item.usbC || family === "imac" || family === "mac-mini";
    s.batteryHours = item.formFactor === "portable" ? (modern ? 10 : 7) : null;
    s.portsLabel = item.usbC ? "Thunderbolt 3 (USB-C)" : "USB-A y puertos antiguos";
  }
  return s;
}

/**
 * Ancho de banda de memoria en GB/s (fichas de Apple). Decide la velocidad de los modelos
 * de IA en local. M5 Pro/Max y M6 son aproximaciones a partir de la generación anterior.
 */
export function bandwidthOf(item: CatalogItem): number {
  if (!isAppleSilicon(item)) return 30;
  if (/a18/i.test(item.chip)) return 60;
  const tier = tierOf(item);
  const g = gen(item);
  const table: Record<Tier, number[]> = {
    base: [0, 68, 100, 100, 120, 153, 160],
    pro: [0, 200, 200, 150, 273, 307, 320],
    max: [0, 400, 400, 400, 546, 614, 640],
    ultra: [0, 800, 800, 819, 819, 1228, 1280],
  };
  return table[tier][Math.min(g, 6)] ?? 100;
}

export const TIER_LABEL: Record<Tier, string> = { base: "chip base", pro: "Pro", max: "Max", ultra: "Ultra" };
