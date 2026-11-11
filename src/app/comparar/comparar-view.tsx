"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ModelPicker } from "@/components/model-picker";
import { Light } from "@/components/ui";
import { getItem } from "@/lib/catalog";
import { chipRank } from "@/lib/depreciation";
import { amortisation, channels, resaleIn } from "@/lib/economics";
import { eur } from "@/lib/format";
import { explain, USE_LABEL, type TermId, type Use } from "@/lib/glossary";
import { lifecycle } from "@/lib/lifecycle";
import { specsOf } from "@/lib/specs";
import type { CatalogItem } from "@/lib/types";

type Slot = { item: CatalogItem; ram: number; si: number };

function slotFor(item: CatalogItem): Slot {
  return { item, ram: item.ramGB, si: 0 };
}

const USES = Object.keys(USE_LABEL) as Use[];

export function CompararView() {
  const params = useSearchParams();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [adding, setAdding] = useState(false);
  const [uses, setUses] = useState<Use[]>(["basico"]);

  useEffect(() => {
    const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
    const items = ids.map((id) => getItem(id)).filter((item): item is CatalogItem => item != null).slice(0, 3);
    if (items.length) setSlots(items.map(slotFor));
    if (items.length < 2) setAdding(true);
  }, [params]);

  const data = useMemo(
    () =>
      slots.map((slot) => {
        const life = lifecycle(slot.item);
        const specs = specsOf(slot.item);
        const ch = channels(slot.item, slot.ram, slot.si);
        const used = ch.particular?.typical ?? ch.reacondicionado?.typical ?? ch.nuevo?.typical ?? null;
        const amort = used != null ? amortisation(slot.item, slot.ram, slot.si, used, 5) : null;
        return { slot, life, specs, ch, used, amort, resale: resaleIn(slot.item, slot.ram, slot.si, 3), storage: slot.item.storageOptions[slot.si] };
      }),
    [slots],
  );

  type Row = { term: TermId; label: string; cells: string[]; best?: number };
  const pickBest = (values: (number | null)[], mode: "max" | "min") => {
    const valid = values.map((value, index) => ({ value, index })).filter((entry) => entry.value != null) as { value: number; index: number }[];
    if (valid.length < 2) return undefined;
    const sorted = [...valid].sort((a, b) => (mode === "max" ? b.value - a.value : a.value - b.value));
    return sorted[0].value === sorted[1].value ? undefined : sorted[0].index;
  };
  const rows: Row[] = data.length
    ? [
        { term: "chip", label: "Chip", cells: data.map((d) => d.slot.item.chip), best: pickBest(data.map((d) => chipRank(d.slot.item.chip, d.slot.item.year)), "max") },
        { term: "ram", label: "Memoria", cells: data.map((d) => `${d.slot.ram} GB`), best: pickBest(data.map((d) => d.slot.ram), "max") },
        { term: "ssd", label: "Almacenamiento", cells: data.map((d) => d.storage?.label.replace(" SSD", "") ?? "—"), best: pickBest(data.map((d) => d.storage?.gb ?? null), "max") },
        { term: "pantalla", label: "Pantalla", cells: data.map((d) => `${d.specs.screenLabel}${d.specs.promotion120 ? " 120 Hz" : ""}${d.specs.brightnessNits ? ` ${d.specs.brightnessNits} nits` : ""}`) },
        { term: "puertos", label: "Puertos", cells: data.map((d) => [d.specs.hdmi ? "HDMI" : "", d.specs.sd ? "SD" : "", d.specs.magsafe ? "MagSafe" : "", d.specs.ethernet ? "Ethernet" : ""].filter(Boolean).join(" · ") || "Solo USB-C") },
        { term: "peso", label: "Peso", cells: data.map((d) => (d.specs.weightKg ? `${String(d.specs.weightKg).replace(".", ",")} kg` : "—")), best: pickBest(data.map((d) => (d.slot.item.formFactor === "portable" ? d.specs.weightKg : null)), "min") },
        { term: "externas", label: "Pantallas ext.", cells: data.map((d) => String(d.specs.externalDisplays)), best: pickBest(data.map((d) => d.specs.externalDisplays), "max") },
        { term: "soporte", label: "Soporte", cells: data.map((d) => (d.life.light === "rojo" ? "Terminado" : `≈ ${Math.floor(d.life.yearsLeft)} años*`)), best: pickBest(data.map((d) => d.life.yearsLeft), "max") },
        { term: "amortizacion", label: "Coste por año", cells: data.map((d) => (d.amort ? `≈ ${d.amort.perYear} €` : "—")), best: pickBest(data.map((d) => d.amort?.perYear ?? null), "min") },
        { term: "reventa", label: "Reventa en 3 años", cells: data.map((d) => (d.resale != null ? `≈ ${eur(d.resale)}` : "—")) },
        { term: "precio", label: "Precio usado", cells: data.map((d) => (d.used != null ? `≈ ${eur(d.used)}` : "—")), best: pickBest(data.map((d) => d.used), "min") },
      ]
    : [];

  return (
    <main className="screen wide compare">
      <div className="kick">Comparador · hasta 3 Mac</div>
      <h1 className="question">Lado a lado, y qué significa cada cosa</h1>
      <p className="legend">Explícamelo para:</p>
      <div className="chip-row" style={{ marginBottom: 14 }}>
        {USES.map((use) => (
          <button key={use} type="button" className={uses.includes(use) ? "chip on" : "chip"} onClick={() => setUses(uses.includes(use) ? uses.filter((u) => u !== use) : [use, ...uses])}>
            {USE_LABEL[use]}
          </button>
        ))}
      </div>

      {data.length ? (
        <table className="cmp">
          <thead>
            <tr>
              {data.map((d, index) => (
                <th key={d.slot.item.id + index}>
                  {d.slot.item.name.replace("MacBook", "MB")} {d.slot.item.sizeLabel !== "—" ? d.slot.item.sizeLabel : ""}
                  <br />
                  <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>{d.slot.item.year}</span>
                  <Light light={d.life.light} small />
                  <button type="button" className="chip" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => setSlots(slots.filter((_, i) => i !== index))}>Quitar</button>
                </th>
              ))}
              <th className="why-h desk-only"><span className="kick">Qué significa para ti</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const entry = explain(row.term, uses);
              return [
                <tr key={row.term + "-h"} className="rowhead">
                  <td colSpan={data.length}><span className="kick">{row.label}</span></td>
                  <td className="desk-only" />
                </tr>,
                <tr key={row.term}>
                  {row.cells.map((cell, index) => (
                    <td key={index} className={row.best === index ? "win" : ""}>{cell}</td>
                  ))}
                  <td className="why-side desk-only">
                    {entry.text}
                    {entry.forYou ? <> <b>Para ti:</b> {entry.forYou}</> : null}
                  </td>
                </tr>,
                <tr key={row.term + "-w"} className="mob-only">
                  <td colSpan={data.length} className="why">
                    {entry.text}
                    {entry.forYou ? <> <b>Para ti:</b> {entry.forYou}</> : null}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      ) : null}
      {data.length ? <p className="est">* Estimación según cómo ha actualizado Apple sus Mac hasta ahora. En verde, el mejor de cada fila. Coste por año a 5 años, con el precio usado.</p> : null}

      {slots.length < 3 ? (
        adding ? (
          <div style={{ marginTop: 16 }}>
            <h2 className="h2">{slots.length ? "Añade otro Mac" : "Elige el primer Mac"}</h2>
            <ModelPicker exclude={slots.map((slot) => slot.item.id)} onPick={(item) => { setSlots([...slots, slotFor(item)]); if (slots.length + 1 >= 2) setAdding(false); }} />
          </div>
        ) : (
          <button type="button" className="cta" onClick={() => setAdding(true)}>
            <span>Añadir otro Mac</span>
            <span className="mono">{slots.length}/3 +</span>
          </button>
        )
      ) : null}
    </main>
  );
}
