"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ConfigPicker } from "@/components/model-picker";
import { AmortPanel, EstimateNote, Explain, LifecyclePanel, OfferHead, PriceRows, Traps } from "@/components/ui";
import { getItem } from "@/lib/catalog";
import { amortisation, channels, resaleIn } from "@/lib/economics";
import { eur, generationEs } from "@/lib/format";
import { INTEL_DISCLAIMER, lifecycle } from "@/lib/lifecycle";
import { specsOf } from "@/lib/specs";
import { trapsFor } from "@/lib/traps";

export function ModeloView() {
  const params = useSearchParams();
  const item = getItem(params.get("id") ?? "");
  const [ram, setRam] = useState(() => Number(params.get("ram")) || item?.ramGB || 8);
  const [si, setSi] = useState(() => Number(params.get("si")) || 0);
  if (!item) {
    return (
      <main className="screen">
        <h1 className="question">No encuentro ese Mac</h1>
        <Link className="cta" href="/catalogo"><span>Ir al catálogo</span><span className="mono">→</span></Link>
      </main>
    );
  }
  const life = lifecycle(item);
  const specs = specsOf(item);
  const ch = channels(item, ram, si);
  const cheapest = [ch.particular, ch.reacondicionado, ch.nuevo].filter(Boolean).map((quote) => quote!.typical).sort((a, b) => a - b)[0];
  const best = ch.particular ? "particular" : ch.reacondicionado ? "reacondicionado" : "nuevo";
  const amort = cheapest ? amortisation(item, ram, si, cheapest, 5) : null;
  const r2 = resaleIn(item, ram, si, 2);
  const r3 = resaleIn(item, ram, si, 3);
  const storage = item.storageOptions[si] ?? null;
  const rows: { label: string; value: string; term: Parameters<typeof Explain>[0]["term"] }[] = [
    { label: "Chip", value: `${item.chip} · ${item.cpu}`, term: "chip" },
    { label: "Memoria", value: `${ram} GB`, term: "ram" },
    { label: "Almacenamiento", value: storage?.label ?? "—", term: "ssd" },
    { label: "Pantalla", value: `${specs.screenLabel}${specs.promotion120 ? " · 120 Hz" : ""}${specs.brightnessNits ? ` · ${specs.brightnessNits} nits` : ""}`, term: "pantalla" },
    { label: "Puertos", value: specs.portsLabel || "—", term: "puertos" },
    { label: "Pantallas externas", value: `${specs.externalDisplays}${specs.externalNote ? ` (${specs.externalNote.toLowerCase()})` : ""}`, term: "externas" },
    ...(item.formFactor === "portable"
      ? [
          { label: "Peso", value: specs.weightKg ? `${String(specs.weightKg).replace(".", ",")} kg` : "—", term: "peso" as const },
          { label: "Batería", value: specs.batteryHours ? `hasta ≈ ${specs.batteryHours} h de vídeo` : "—", term: "bateria" as const },
        ]
      : []),
  ];
  return (
    <main className="screen wide sheet">
      {/* Escritorio: tarjeta y tres paneles arriba; debajo, dos columnas. En el móvil las cajas son display: contents. */}
      <div className="card sh-card">
        <OfferHead item={item} kicker={`Ficha · ${generationEs(item.generation)}`} sub={`${ram} GB RAM · ${storage?.label ?? ""}`.toUpperCase()} />
        <PriceRows channels={ch} best={best} />
        <p className="save">Precios orientativos para esta configuración en España.{item.launchPriceEUR ? <> Salió a <b>{eur(item.launchPriceEUR)}</b>.</> : null}</p>
      </div>
      <div className="sh-config" style={{ marginTop: 12 }}>
        <ConfigPicker item={item} ram={ram} storageIndex={si} onChange={(nextRam, nextSi) => { setRam(nextRam); setSi(nextSi); }} />
      </div>
      <div className="panels sh-panels" style={{ marginTop: 12 }}>
        <LifecyclePanel life={life} />
        {amort ? <AmortPanel amort={amort} /> : <div className="panel"><div className="kick">Amortización</div><p className="note">Sin precio contrastado.</p></div>}
        <div className="panel desk-only">
          <div className="kick">Reventa</div>
          <div className="big-num">{r2 != null ? <>≈{eur(r2)}</> : "—"}</div>
          <p className="note">si lo vendes en 2 años a un particular</p>
          <dl className="kv">
            <dt>En 3 años</dt>
            <dd>{r3 != null ? `≈ ${eur(r3)}` : "—"}</dd>
          </dl>
          <p className="est">Estimación: pierde ≈ 14–16 % al año, más si se acerca el fin del soporte.</p>
        </div>
      </div>
      <div className="sh-left">
        <p className="note" style={{ marginTop: 10 }}>{life.summary}</p>
        <EstimateNote />
        <p className="note mob-only" style={{ marginTop: 10 }}>
          Reventa estimada entre particulares: <b>≈ {r2 != null ? eur(r2) : "—"}</b> en 2 años y <b>≈ {r3 != null ? eur(r3) : "—"}</b> en 3.
        </p>
        {!life.appleSilicon ? (
          <div className="panel" style={{ marginTop: 12, borderColor: "var(--y)" }}>
            <div className="kick" style={{ color: "var(--y)" }}>Ojo: Intel</div>
            <p className="note" style={{ marginTop: 6 }}>{INTEL_DISCLAIMER}</p>
          </div>
        ) : null}
        <h3 className="h2">Antes de comprarlo</h3>
        <Traps traps={trapsFor(item, ram, storage)} />
      </div>
      <div className="sh-right">
        <h3 className="h2">Qué significa cada cosa</h3>
        {rows.map((row) => (
          <div key={row.label}>
            <div className="between" style={{ paddingTop: 8 }}>
              <span className="kick">{row.label}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{row.value}</span>
            </div>
            <Explain term={row.term} label=" " />
          </div>
        ))}
        <Explain term="intelligence" label={`Apple Intelligence: ${life.appleIntelligence ? "sí" : "no"}`} />
        <div className="linklist" style={{ marginTop: 14 }}>
          <Link href={`/valorar?id=${item.id}&ram=${ram}&si=${si}`}>Tasar este Mac <span className="mono">TASAR →</span></Link>
          <Link href={`/comparar?ids=${item.id}`}>Compararlo con otros <span className="mono">COMPARAR →</span></Link>
          <Link href="/checklist">Comprar usado sin sustos <span className="mono">CHECKLIST →</span></Link>
        </div>
      </div>
    </main>
  );
}
