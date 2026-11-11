import { isAppleSilicon } from "./market";
import type { CatalogItem } from "./types";

/**
 * Ciclo de vida de macOS por modelo.
 *
 * Datos reales (comprobados en noviembre de 2026):
 * - macOS 27 Golden Gate salió el 14 sep 2026 y solo se instala en Mac con chip de Apple
 *   (M1 en adelante y el MacBook Neo con A18 Pro). Ningún Intel.
 * - macOS 26 Tahoe es el último para Intel: MacBook Pro 16″ (2019), MacBook Pro 13″ (2020,
 *   cuatro puertos), iMac 27″ (2020) y Mac Pro (2019). Apple anunció unos tres años de
 *   parches de seguridad para esos Intel.
 * - Para el resto de Intel se usa la tabla de compatibilidad publicada por Apple de cada versión.
 *
 * Estimaciones (la app las marca como tales): última gran versión para chips de Apple y
 * fin de los parches. Históricamente un Mac recibe unas 7 versiones grandes desde que sale
 * su generación, y Apple sigue parcheando unos 2 años después de la última.
 */

export const CURRENT_MACOS = { version: 27, name: "Golden Gate", released: 2026.7 };

type Release = { version: number; name: string; year: number };

const RELEASES: Release[] = [
  { version: 10.6, name: "Snow Leopard", year: 2009 },
  { version: 10.7, name: "Lion", year: 2011 },
  { version: 10.11, name: "El Capitan", year: 2015 },
  { version: 10.13, name: "High Sierra", year: 2017 },
  { version: 10.14, name: "Mojave", year: 2018 },
  { version: 10.15, name: "Catalina", year: 2019 },
  { version: 11, name: "Big Sur", year: 2020 },
  { version: 12, name: "Monterey", year: 2021 },
  { version: 13, name: "Ventura", year: 2022 },
  { version: 14, name: "Sonoma", year: 2023 },
  { version: 15, name: "Sequoia", year: 2024 },
  { version: 26, name: "Tahoe", year: 2025 },
  { version: 27, name: "Golden Gate", year: 2026 },
];

export function macosLabel(version: number): string {
  const release = RELEASES.find((entry) => entry.version === version);
  if (version >= 11) return release ? `macOS ${version} ${release.name}` : `macOS ${version}`;
  return release ? `macOS ${release.name} (${String(version).replace(".", ",")})` : `macOS ${version}`;
}

/** Último macOS que instala un Intel, según las listas de compatibilidad de Apple. */
export function intelLastMacOS(item: CatalogItem): number {
  const { family, year, month, screenInches } = item;
  const chip = item.chip.toLowerCase();
  const coreDuoOnly = /core duo/.test(chip) && !/core 2/.test(chip);
  if (family === "macbook-air") {
    if (year >= 2020) return 15;
    if (year >= 2018) return 14;
    if (year >= 2015) return 12;
    if (year >= 2013) return 11;
    if (year === 2012) return 10.15;
    if (year >= 2010) return 10.13;
    return 10.11;
  }
  if (family === "macbook-pro") {
    if (year >= 2020) return item.id === "mbp-13-2020-4ports" ? 26 : 15;
    if (year === 2019) return screenInches >= 16 ? 26 : 15;
    if (year === 2018) return 15;
    if (year === 2017) return 13;
    if (year >= 2015) return 12;
    if (year === 2014 || (year === 2013 && month >= 10)) return 11;
    if (year >= 2012) return 10.15;
    if (year >= 2010) return 10.13;
    if (year >= 2008 || (year === 2007 && month >= 6)) return 10.11;
    return coreDuoOnly ? 10.6 : 10.7;
  }
  if (family === "macbook" || family === "macbook-neo") {
    if (year >= 2017) return 13;
    if (year === 2016) return 12;
    if (year === 2015) return 11;
    if (year === 2010 || (year === 2009 && month >= 10)) return 10.13;
    if (year >= 2008) return 10.11;
    return coreDuoOnly ? 10.6 : 10.7;
  }
  if (family === "imac") {
    if (/xeon/.test(chip)) return 15; // iMac Pro 2017
    if (year >= 2020) return screenInches >= 26 ? 26 : 15;
    if (year >= 2019) return 15;
    if (year >= 2017) return 13;
    if (year === 2016 || (year === 2015 && month >= 10)) return 12;
    if (year >= 2014 || year === 2015) return 11;
    if (year === 2013 || (year === 2012 && month >= 10)) return 10.15;
    if (year >= 2010 || (year === 2009 && month >= 10)) return 10.13;
    if (year >= 2007) return 10.11;
    return coreDuoOnly ? 10.6 : 10.7;
  }
  if (family === "mac-mini") {
    if (year >= 2018) return 15;
    if (year >= 2014) return 12;
    if (year >= 2012) return 10.15;
    if (year >= 2010) return 10.13;
    if (year >= 2009) return 10.11;
    return coreDuoOnly ? 10.6 : 10.7;
  }
  if (family === "mac-pro") {
    if (year >= 2019) return 26;
    if (year >= 2013) return 12;
    if (year >= 2010) return 10.14;
    if (year >= 2008) return 10.11;
    return 10.7;
  }
  return 10.13;
}

export type Light = "verde" | "amarillo" | "rojo";

export type Lifecycle = {
  appleSilicon: boolean;
  /** Último macOS que instala (o el actual si lo recibe). */
  latestVersion: number;
  latestLabel: string;
  receivesCurrent: boolean;
  appleIntelligence: boolean;
  /** Año de la última versión grande. Estimado en chips de Apple. */
  lastMajorYear: number;
  lastMajorVersion: number;
  lastMajorLabel: string;
  lastMajorEstimated: boolean;
  /** Fin de los parches de seguridad (año decimal, septiembre ≈ .7). */
  securityEnd: number;
  securityEndEstimated: boolean;
  yearsLeft: number;
  light: Light;
  lightLabel: string;
  /** Generaciones de chip por detrás de la actual: las novedades de macOS llegan antes a los nuevos. */
  generationsBehind: number;
  summary: string;
};

const NEWEST_GENERATION = 6;

/** Año de la generación del chip (el A18 Pro del Neo es de 2024). */
function chipYear(item: CatalogItem): number {
  if (/a18/i.test(item.chip)) return 2024;
  return item.year;
}

export function chipGenerationOf(item: CatalogItem): number | null {
  if (!isAppleSilicon(item)) return null;
  if (/a18/i.test(item.chip)) return 3; // a la altura de un M3 en funciones de macOS
  const match = item.chip.match(/^M(\d+)/);
  return match ? Number(match[1]) : null;
}

export function versionForYear(year: number): number {
  // Desde 2025 la versión es el año siguiente (26 en 2025, 27 en 2026…).
  if (year >= 2025) return year - 1999;
  return RELEASES.find((entry) => entry.year === year)?.version ?? 15;
}

function securityEndForIntel(last: number): number {
  if (last === 26) return 2028.7; // Apple: unos tres años más de parches para los Intel de Tahoe
  if (last === 15) return 2027.7; // Sequoia, como penúltima, recibe parches hasta que salga macOS 28
  if (last === 14) return 2026.7; // Sonoma dejó de recibirlos con macOS 27
  const release = RELEASES.find((entry) => entry.version === last);
  return (release?.year ?? 2015) + 2.7;
}

export function lifecycle(item: CatalogItem, asOf: Date = new Date()): Lifecycle {
  const now = asOf.getUTCFullYear() + asOf.getUTCMonth() / 12;
  const appleSilicon = isAppleSilicon(item);
  let latestVersion: number;
  let lastMajorYear: number;
  let lastMajorVersion: number;
  let securityEnd: number;
  if (appleSilicon) {
    latestVersion = CURRENT_MACOS.version;
    lastMajorYear = Math.max(asOf.getUTCFullYear(), chipYear(item) + 7);
    lastMajorVersion = versionForYear(lastMajorYear);
    securityEnd = lastMajorYear + 2.7;
  } else {
    latestVersion = intelLastMacOS(item);
    lastMajorVersion = latestVersion;
    lastMajorYear = RELEASES.find((entry) => entry.version === latestVersion)?.year ?? 2015;
    securityEnd = securityEndForIntel(latestVersion);
  }
  const yearsLeft = Math.max(0, Math.round((securityEnd - now) * 10) / 10);
  const light: Light = yearsLeft >= 2 ? "verde" : yearsLeft > 0 ? "amarillo" : "rojo";
  const generation = chipGenerationOf(item);
  const generationsBehind = generation == null ? NEWEST_GENERATION : Math.max(0, NEWEST_GENERATION - generation);
  const receivesCurrent = latestVersion >= CURRENT_MACOS.version;
  const lightLabel = light === "verde" ? "Le quedan años" : light === "amarillo" ? "Menos de 2 años de parches" : "Sin actualizaciones";
  const roundedYears = Math.max(1, Math.round(yearsLeft));
  const years = yearsLeft >= 0.75 ? `≈ ${roundedYears} ${roundedYears === 1 ? "año" : "años"}` : "unos meses";
  const summary = light === "rojo"
    ? `Se quedó en ${macosLabel(latestVersion)} y ya no recibe parches de seguridad.`
    : receivesCurrent
      ? `Recibe ${macosLabel(CURRENT_MACOS.version)}. Le quedan ${years} de soporte.`
      : `Se queda en ${macosLabel(latestVersion)}, solo con parches ${years} más.`;
  return {
    appleSilicon,
    latestVersion,
    latestLabel: macosLabel(latestVersion),
    receivesCurrent,
    appleIntelligence: appleSilicon,
    lastMajorYear,
    lastMajorVersion,
    lastMajorLabel: appleSilicon ? `macOS ${lastMajorVersion}` : macosLabel(lastMajorVersion),
    lastMajorEstimated: appleSilicon,
    securityEnd,
    securityEndEstimated: appleSilicon || latestVersion >= 15,
    yearsLeft,
    light,
    lightLabel,
    generationsBehind,
    summary,
  };
}

export const ESTIMATE_NOTE = "Las fechas con ≈ son estimaciones a partir de cómo ha actualizado Apple sus Mac hasta ahora: unas 7 versiones grandes por generación y unos 2 años de parches después de la última. No son fechas oficiales.";

export const INTEL_DISCLAIMER = "Mac con Intel: sin Apple Intelligence, peor batería y más calor que cualquier chip de Apple, cada vez más apps que dejan de darle soporte, y el fin de las actualizaciones está cerca. Solo tiene sentido si el presupuesto es muy justo y el uso es sencillo.";
