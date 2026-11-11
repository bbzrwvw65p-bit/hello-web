import { lifecycle } from "./lifecycle";
import { isAppleSilicon } from "./market";
import { specsOf } from "./specs";
import type { CatalogItem, StorageOption } from "./types";

export type Trap = { level: "aviso" | "ojo"; text: string };

/** Configuraciones trampa: cosas que no se arreglan después de comprar. */
export function trapsFor(item: CatalogItem, ramGB: number, storage: StorageOption | null, asOf: Date = new Date()): Trap[] {
  const traps: Trap[] = [];
  const specs = specsOf(item);
  const life = lifecycle(item, asOf);
  const silicon = isAppleSilicon(item);
  if (ramGB > 0 && ramGB <= 8 && silicon) traps.push({ level: "ojo", text: "8 GB se quedan cortos en 2026: con el navegador, una videollamada y Apple Intelligence ya va justo. Y no se amplía." });
  if (ramGB > 0 && ramGB < 8) traps.push({ level: "ojo", text: `${ramGB} GB de RAM son muy pocos para el macOS de hoy.` });
  if (silicon && storage?.gb && storage.gb <= 256) traps.push({ level: "aviso", text: "256 GB no se amplían por dentro. Si guardas fotos o vídeo, cuenta con un disco externo." });
  if (storage?.kind === "hdd") traps.push({ level: "ojo", text: "Disco duro mecánico: lentísimo para el sistema de hoy. Cambiarlo por un SSD es casi obligatorio." });
  if (specs.externalNote && item.formFactor === "portable") traps.push({ level: "aviso", text: `${item.name} ${item.chip}: ${specs.externalNote.toLowerCase()}.` });
  if (item.family === "macbook-neo") traps.push({ level: "aviso", text: "El Neo solo tiene 8 GB y uno de sus dos USB-C es lento (USB 2). Bien para lo básico; para más, no." });
  if (!silicon) traps.push({ level: "ojo", text: "Intel: sin macOS 27, sin Apple Intelligence y con el fin de los parches cerca." });
  if (item.family === "macbook-pro" && item.year >= 2016 && item.year <= 2019 && item.screenInches < 16) traps.push({ level: "ojo", text: "Teclado de mariposa (2016–2019): falla con facilidad y cuesta caro de reparar." });
  if (item.family === "macbook-pro" && item.year >= 2016 && item.year <= 2020) traps.push({ level: "aviso", text: "Touch Bar y solo USB-C: necesitarás adaptadores." });
  if (life.light === "amarillo") traps.push({ level: "aviso", text: "Le quedan menos de 2 años de parches de seguridad." });
  if (life.light === "rojo") traps.push({ level: "ojo", text: "Ya no recibe parches de seguridad: no lo uses para banca ni datos sensibles." });
  return traps;
}
