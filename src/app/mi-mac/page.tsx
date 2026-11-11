"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { DonateButton } from "@/components/donate";
import { MacDetect } from "@/components/mac-detect";
import { ConfigPicker, ModelPicker } from "@/components/model-picker";
import { Explain, LifecyclePanel, modelHref, OfferHead, Traps } from "@/components/ui";
import { eur } from "@/lib/format";
import { USE_LABEL, type Use } from "@/lib/glossary";
import { ESTIMATE_NOTE, INTEL_DISCLAIMER } from "@/lib/lifecycle";
import { changeOrWait } from "@/lib/mimac";
import { trapsFor } from "@/lib/traps";
import type { CatalogItem } from "@/lib/types";

const USES = Object.keys(USE_LABEL) as Use[];

export default function MiMacPage() {
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [ram, setRam] = useState(0);
  const [si, setSi] = useState(0);
  const [uses, setUses] = useState<Use[]>([]);
  const [done, setDone] = useState(false);
  const [detectShown, setDetectShown] = useState(false);
  const [manual, setManual] = useState(false);
  const onDetectReady = useCallback((shown: boolean) => setDetectShown(shown), []);
  const pickItem = (picked: CatalogItem) => { setItem(picked); setRam(picked.ramGB); setSi(0); };
  const verdict = useMemo(() => (item && done ? changeOrWait(item, ram, si, uses) : null), [item, ram, si, uses, done]);

  if (!item) {
    const detecting = !manual && detectShown;
    return (
      <main className={detecting ? "screen wide" : "screen"}>
        <div className="kick">01 / 03 · Tu Mac</div>
        {!manual ? <MacDetect onPick={pickItem} onDismiss={() => setManual(true)} onReady={onDetectReady} /> : null}
        {detecting ? null : (
          <>
            <h1 className="question">¿Qué Mac tienes ahora?</h1>
            <p className="sub">Lo ves en el menú Apple → Acerca de este Mac.</p>
            <ModelPicker onPick={pickItem} />
          </>
        )}
      </main>
    );
  }

  if (!done) {
    return (
      <main className="screen">
        <div className="kick">02 / 03 · Configuración y uso</div>
        <button type="button" className="back-btn" onClick={() => setItem(null)}>← Cambiar de modelo</button>
        <h1 className="question">{item.name} {item.chip} {item.sizeLabel !== "—" ? item.sizeLabel : ""} · {item.year}</h1>
        <ConfigPicker item={item} ram={ram} storageIndex={si} onChange={(nextRam, nextSi) => { setRam(nextRam); setSi(nextSi); }} />
        <p className="legend" style={{ marginTop: 18 }}>¿Para qué lo usas?</p>
        <div className="opts">
          {USES.map((use) => {
            const on = uses.includes(use);
            return (
              <button key={use} type="button" className={on ? "opt on" : "opt"} style={{ minHeight: 52 }} onClick={() => setUses(on ? uses.filter((u) => u !== use) : [...uses, use])}>
                <span className="top"><b>{USE_LABEL[use]}</b><span className="box">{on ? "✓" : ""}</span></span>
              </button>
            );
          })}
        </div>
        <button type="button" className="cta glow" disabled={!uses.length} onClick={() => setDone(true)}>
          <span>¿Cambio o espero?</span>
          <span className="mono">→</span>
        </button>
      </main>
    );
  }

  if (!verdict) return null;
  const tone = verdict.kind === "espera" ? "var(--g)" : verdict.kind === "planifica" ? "var(--y)" : "var(--r)";
  const storage = item.storageOptions[si] ?? null;
  return (
    <main className="screen">
      <div className="kick">03 / 03 · Veredicto</div>
      <div className="card" style={{ marginTop: 10, borderTop: `6px solid ${tone}` }}>
        <OfferHead item={item} kicker={verdict.kind === "espera" ? "No cambies" : verdict.kind === "planifica" ? "Aguanta y planifica" : "Toca cambiar"} sub={`${ram} GB RAM · ${storage?.label ?? ""}`.toUpperCase()} />
        <p style={{ fontSize: 19, fontWeight: 300, marginTop: 10, lineHeight: 1.3 }}>{verdict.headline}</p>
        {verdict.reasons.length ? (
          <ul className="note" style={{ paddingLeft: 18, margin: "10px 0 0" }}>
            {verdict.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="panels" style={{ marginTop: 10 }}>
        <LifecyclePanel life={verdict.life} />
        <div className="panel">
          <div className="kick">Esperar cuesta</div>
          <div className="big-num">{verdict.waitingCostPerYear != null ? <>≈{verdict.waitingCostPerYear}<small> €/año</small></> : "—"}</div>
          <dl className="kv">
            <dt>Vale hoy</dt><dd>{verdict.valueNow != null ? `≈ ${eur(verdict.valueNow)}` : "—"}</dd>
            <dt>En un año</dt><dd>{verdict.valueNextYear != null ? `≈ ${eur(verdict.valueNextYear)}` : "—"}</dd>
          </dl>
          <p className="est">Lo que pierde de valor si esperas un año para venderlo.</p>
        </div>
      </div>
      <p className="est">* {ESTIMATE_NOTE}</p>
      {!verdict.life.appleSilicon ? <p className="note" style={{ marginTop: 10 }}>{INTEL_DISCLAIMER}</p> : null}
      <div style={{ marginTop: 12 }}>
        <Traps traps={trapsFor(item, ram, storage)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <Explain term="soporte" uses={uses} />
        <Explain term="semaforo" />
        <Explain term="ram" uses={uses} />
      </div>
      <div className="linklist" style={{ marginTop: 12 }}>
        {verdict.kind !== "espera" ? <Link href={verdict.recommendHref}>Qué Mac me compro <span className="mono">RECOMENDAR →</span></Link> : null}
        <Link href={`/valorar?id=${item.id}&ram=${ram}&si=${si}`}>Cuánto me dan por el mío <span className="mono">TASAR →</span></Link>
        <Link href={modelHref(item, ram, si)}>Ficha de mi Mac <span className="mono">FICHA →</span></Link>
        <button type="button" onClick={() => { setDone(false); setItem(null); setUses([]); }}>Probar con otro <span className="mono">↺</span></button>
      </div>
      <DonateButton />
    </main>
  );
}
