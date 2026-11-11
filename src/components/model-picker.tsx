"use client";

import { useMemo, useState } from "react";
import { getCatalog } from "@/lib/catalog";
import { FAMILY_ICON, generationEs, modelTitle } from "@/lib/format";
import { asset } from "@/lib/paths";
import type { CatalogItem, FamilyId } from "@/lib/types";

const catalog = getCatalog();
const FAMILIES: { id: FamilyId; label: string }[] = [
  { id: "macbook-air", label: "Air" },
  { id: "macbook-pro", label: "Pro" },
  { id: "macbook-neo", label: "Neo" },
  { id: "imac", label: "iMac" },
  { id: "mac-mini", label: "mini" },
  { id: "mac-studio", label: "Studio" },
  { id: "macbook", label: "MacBook" },
  { id: "mac-pro", label: "Mac Pro" },
];

/** Busca un Mac del catálogo por familia o texto. */
export function ModelPicker({ onPick, exclude = [] }: { onPick: (item: CatalogItem) => void; exclude?: string[] }) {
  const [family, setFamily] = useState<FamilyId | null>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!family && !needle) return [];
    const seen = new Set<string>();
    return catalog
      .filter((item) => !exclude.includes(item.id))
      .filter((item) => (family ? item.family === family : true))
      .filter((item) => (needle ? `${item.name} ${item.chip} ${item.year} ${item.sizeLabel} ${item.cpu}`.toLowerCase().includes(needle) : true))
      .filter((item) => {
        const key = `${item.family}-${item.sizeLabel}-${item.chip}-${item.year}-${item.generation}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 40);
  }, [family, query, exclude]);
  return (
    <div className="stack tight">
      <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca: M2, 2019, Air 15…" aria-label="Buscar modelo" />
      <div className="chip-row">
        {FAMILIES.map((entry) => (
          <button key={entry.id} type="button" className={family === entry.id ? "chip on" : "chip"} onClick={() => setFamily(family === entry.id ? null : entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>
      <div>
        {results.map((item) => (
          <button key={item.id} type="button" className="list-row" style={{ width: "100%", background: "none", border: 0, borderBottom: "0.5px solid var(--hair)", color: "#fff", textAlign: "left" }} onClick={() => onPick(item)}>
            <img src={asset(FAMILY_ICON[item.family])} alt="" />
            <span>
              <strong>{modelTitle(item)}</strong> · {item.chip}
              <br />
              <span className="note">{generationEs(item.generation)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfigPicker({ item, ram, storageIndex, onChange }: { item: CatalogItem; ram: number; storageIndex: number; onChange: (ram: number, storageIndex: number) => void }) {
  const rams = item.ramOptions.length ? item.ramOptions.map((option) => option.gb) : [item.ramGB];
  return (
    <div className="split">
      <label className="field-label">
        Memoria
        <select className="field" value={ram} onChange={(event) => onChange(Number(event.target.value), storageIndex)}>
          {rams.map((gb) => (
            <option key={gb} value={gb}>
              {gb} GB
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Disco
        <select className="field" value={storageIndex} onChange={(event) => onChange(ram, Number(event.target.value))}>
          {item.storageOptions.map((option, index) => (
            <option key={option.label + index} value={index}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
