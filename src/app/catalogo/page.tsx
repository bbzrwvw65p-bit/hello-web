"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { eur, generationEs, modelTitle, ramLabel } from "@/lib/format";
import { asset } from "@/lib/paths";
import type { FamilyId } from "@/lib/types";

const catalog = getCatalog();
const filters: { id: FamilyId | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "macbook-air", label: "Air" },
  { id: "macbook-pro", label: "Pro" },
  { id: "macbook-neo", label: "Neo" },
  { id: "macbook", label: "MacBook" },
  { id: "imac", label: "iMac" },
  { id: "mac-mini", label: "mini" },
  { id: "mac-studio", label: "Studio" },
  { id: "mac-pro", label: "Mac Pro" },
];

export default function CatalogoPage() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FamilyId | "todos">("todos");
  const [shown, setShown] = useState(24);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (family !== "todos" && item.family !== family) return false;
      if (!needle) return true;
      return `${item.name} ${item.generation} ${item.cpu} ${item.chip} ${item.year}`.toLowerCase().includes(needle);
    });
  }, [query, family]);

  const visible = filtered.slice(0, shown);

  const icon: Record<string, string> = {
    "macbook-air": "/hello/macbook-air.png",
    "macbook-pro": "/hello/macbook-pro.png",
    macbook: "/hello/macbook.png",
    "macbook-neo": "/hello/macbook.png",
    imac: "/hello/imac.png",
    "mac-mini": "/hello/mac-mini.png",
    "mac-studio": "/hello/mac-mini.png",
    "mac-pro": "/hello/mac-pro.png",
  };

  return (
    <main className="screen">
      <h1 className="question">Catálogo</h1>
      <p className="note">{catalog.length} configuraciones. Toca una para tasarla.</p>
      <input className="field" value={query} onChange={(event) => { setQuery(event.target.value); setShown(24); }} placeholder="Busca M4, 2015, Mac mini…" style={{ marginTop: 12 }} />
      <div className="chip-row" style={{ margin: "12px 0", justifyContent: "flex-start" }}>
        {filters.map((filter) => (
          <button key={filter.id} type="button" className={family === filter.id ? "chip on" : "chip"} onClick={() => { setFamily(filter.id); setShown(24); }}>
            {filter.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="note">Ningún Mac coincide con esa búsqueda.</p>
      ) : (
        visible.map((item) => (
          <Link key={item.id} href={`/resultado?id=${item.id}&ram=${item.ramGB}&si=0`} className="list-row">
            <img src={asset(icon[item.family])} alt="" />
            <span>
              <strong>{modelTitle(item)}</strong>
              {item.availability === "current" ? " · Actual" : item.availability === "preorder" ? " · Preventa" : ""}
              <br />
              <span className="note">
                {generationEs(item.generation)} · {item.cpu}
                <br />
                {ramLabel(item.ramGB)} · {item.storageLabel}
                {item.launchPriceEUR ? ` · ${eur(item.launchPriceEUR)}` : ""}
              </span>
            </span>
          </Link>
        ))
      )}
      {shown < filtered.length ? (
        <button type="button" className="ios-choice" style={{ marginTop: 12 }} onClick={() => setShown((count) => count + 24)}>
          Ver más ({filtered.length - shown})
        </button>
      ) : null}
    </main>
  );
}
