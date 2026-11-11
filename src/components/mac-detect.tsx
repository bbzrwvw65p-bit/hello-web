"use client";

import { useEffect, useMemo, useState } from "react";
import { getCatalog } from "@/lib/catalog";
import { candidatesFor, detect, headline, readSignals, type Detection } from "@/lib/detect";
import { FAMILY_ICON, generationEs } from "@/lib/format";
import { lifecycle } from "@/lib/lifecycle";
import { asset } from "@/lib/paths";
import type { CatalogItem } from "@/lib/types";
import { Light } from "./ui";

/**
 * «Parece que usas un MacBook Pro 14″…». Lee el navegador una vez al abrir, en memoria:
 * no guarda nada ni hace llamadas a internet. Si no es un Mac o no hay pistas, no pinta nada.
 */
export function MacDetect({ onPick, onDismiss, onReady }: { onPick: (item: CatalogItem) => void; onDismiss: () => void; onReady?: (shown: boolean) => void }) {
  const [detection, setDetection] = useState<Detection | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const signals = readSignals();
    setDetection(signals ? detect(signals) : null);
  }, []);

  const candidates = useMemo(() => (detection ? candidatesFor(detection, getCatalog(), new Date().getFullYear()) : []), [detection]);
  const title = detection ? headline(detection, candidates) : null;
  const shown = Boolean(detection && title);

  useEffect(() => {
    if (detection) onReady?.(shown);
  }, [detection, shown, onReady]);

  if (!detection || !title) return null;
  const chosen = candidates[selected] ?? candidates[0];

  return (
    <div className="detect">
      <div className="detect-main">
        <div className="kick">Detección automática · sin instalar nada</div>
        <h1 className="question">{title}</h1>
        <p className="sub">El navegador no dice el modelo exacto, así que te enseño los más probables con lo que sí deja ver. Toca el tuyo y seguimos.</p>
        <div className="cands">
          {candidates.map((candidate, index) => (
            <button key={candidate.item.id} type="button" className={index === selected ? "cand on" : "cand"} aria-pressed={index === selected} onClick={() => setSelected(index)}>
              <span className="between">
                <img src={asset(FAMILY_ICON[candidate.item.family])} alt="" />
                <span className="pct">{candidate.likelihood.toUpperCase()}</span>
              </span>
              <b>{candidate.title}</b>
              <span className="spec">{generationEs(candidate.item.generation)}</span>
              <Light light={lifecycle(candidate.item).light} small />
            </button>
          ))}
        </div>
        <div className="detect-actions">
          <button type="button" className="cta glow" onClick={() => onPick(chosen.item)}>
            <span>Sí, es este</span>
            <span className="mono">SIGUIENTE →</span>
          </button>
          <button type="button" className="cta" onClick={onDismiss}>
            <span>Ninguno: elegir a mano</span>
            <span className="mono">BUSCAR →</span>
          </button>
        </div>
        <div className="dashed" style={{ marginTop: 18 }}>
          <details className="explain how" open>
            <summary>
              <span>¿Cómo sé cuál es el mío? En dos pasos</span>
              <span className="q">¿QUÉ SIGNIFICA?</span>
            </summary>
            <ol className="steps2">
              <li>Arriba a la izquierda, abre el <b>menú Apple</b> (la manzana) y elige <b>«Acerca de este Mac»</b>.</li>
              <li>Mira la primera línea: el <b>nombre y el año</b> (por ejemplo, «MacBook Pro 14 pulgadas, noviembre de 2023») y la línea <b>Chip</b> (por ejemplo, «Apple M3 Pro»). Con eso basta.</li>
            </ol>
          </details>
        </div>
      </div>
      <aside className="detect-side">
        <div className="panel">
          <div className="kick">Lo que he podido ver</div>
          <dl className="sig">
            {detection.seen.map((row) => (
              <div key={row.label} className="sig-row">
                <dt>{row.label}</dt>
                <dd style={row.warn ? { color: "var(--y)" } : undefined}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="panel dashed">
          <div className="kick white">Por qué no lo sé seguro</div>
          <p className="note" style={{ marginTop: 8 }}>
            Safari solo dice «Apple GPU». Chrome a veces dice el chip («Apple M3 Pro»): entonces te propongo uno solo. La resolución separa 13″, 14″, 15″ y 16″, pero no el año. Con un monitor externo o la escala cambiada, falla.
          </p>
        </div>
        <p className="privacy">
          <span className="lock mono">PRIVADO</span>
          <span>Nada se guarda ni se envía: todo se calcula en tu navegador y se olvida al cerrar la pestaña.</span>
        </p>
      </aside>
    </div>
  );
}
