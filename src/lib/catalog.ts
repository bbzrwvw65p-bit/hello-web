import raw from "@/data/catalog.json";
import type { CatalogFile, CatalogItem, FamilyId } from "./types";

const file = raw as CatalogFile;

export function getCatalog(): CatalogItem[] {
  return file.items;
}

export function getCatalogMeta() {
  return {
    asOf: file.asOf,
    note: file.note,
    count: file.items.length,
  };
}

export function getItem(id: string): CatalogItem | null {
  return file.items.find((item) => item.id === id) ?? null;
}

export function familiesFor(formFactor: CatalogItem["formFactor"]): FamilyId[] {
  const present = new Set(
    file.items.filter((item) => item.formFactor === formFactor).map((item) => item.family),
  );
  const order: FamilyId[] =
    formFactor === "portable"
      ? ["macbook-air", "macbook-pro", "macbook-neo", "macbook"]
      : ["imac", "mac-mini", "mac-studio", "mac-pro"];
  return order.filter((family) => present.has(family));
}

export function itemsFor(family: FamilyId, formFactor?: CatalogItem["formFactor"]): CatalogItem[] {
  return file.items.filter(
    (item) => item.family === family && (formFactor == null || item.formFactor === formFactor),
  );
}
