"use client";

import Link from "next/link";
import { configLabel, SOURCE_LABEL, type Answers, type Result } from "@/lib/advisor";
import { eur } from "@/lib/format";
import { INTEL_DISCLAIMER } from "@/lib/lifecycle";
import { AltRow, AmortPanel, EstimateNote, Explain, LifecyclePanel, modelHref, OfferHead, offerSpecLine, PriceRows, Traps } from "./ui";

export function AdviceView({ result, answers, onRestart, onBack }: { result: Result; answers: Answers; onRestart: () => void; onBack: () => void }) {
  const primary = result.primary;
  const uses = answers.uses;
  if (!primary) {
    const cheapest = result.cheapestOutOfBudget;
    return (
      <div className="stack">
        <div className="card">
          <div className="kick">{result.needTitle}</div>
          <p style={{ fontSize: 18, fontWeight: 300, marginTop: 8, lineHeight: 1.35 }}>{result.needText}</p>
          <p className="save">
            Con {eur(answers.budget)} no llega para nada que cumpla esto con soporte por delante.
            {cheapest ? (
              <>
                {" "}Lo más barato que encaja ronda <span className="tag">≈ {eur(cheapest.priceEUR)}</span> ({cheapest.item.name} {cheapest.item.chip}, {SOURCE_LABEL[cheapest.source].toLowerCase()}).
              </>
            ) : null}
          </p>
        </div>
        <button type="button" className="cta" onClick={onBack}>
          <span>Cambiar el presupuesto</span>
          <span className="mono">←</span>
        </button>
        <button type="button" className="cta" onClick={onRestart} style={{ marginTop: 0 }}>
          <span>Empezar de nuevo</span>
          <span className="mono">↺</span>
        </button>
      </div>
    );
  }
  const savings = result.savingEUR;
  return (
    <div className="stack">
      <div className="card">
        <OfferHead item={primary.item} kicker={result.needTitle} sub={offerSpecLine(primary)} />
        <p className="save" style={{ marginTop: 8 }}>{result.needText}</p>
        <PriceRows channels={primary.channels} best={primary.source} />
        <p className="save">
          {savings && savings > 20 ? (
            <>
              Te ahorras <span className="tag">≈ {eur(savings)}</span> frente a comprar nuevo algo equivalente.{" "}
            </>
          ) : null}
          Precios orientativos en España.{primary.adaptersEUR ? ` Incluye ≈ ${eur(primary.adaptersEUR)} de adaptadores.` : ""}
        </p>
        {primary.softMisses.length ? <p className="save"><b>A tener en cuenta:</b> {primary.softMisses.join(" · ")}.</p> : null}
      </div>

      <div className="panels">
        <LifecyclePanel life={primary.life} />
        <AmortPanel amort={primary.amort} />
      </div>
      <EstimateNote />
      {primary.amort.futureReplacement ? (
        <p className="note">
          Cuando toque cambiarlo (≈ {primary.amort.futureYear}), un equivalente nuevo costará ≈ <b>{eur(primary.amort.futureReplacement)}</b>: Apple sube precios casi cada generación (≈ 3 % al año).
        </p>
      ) : null}
      <p className="note">
        Reventa estimada entre particulares: <b>≈ {primary.resale2 != null ? eur(primary.resale2) : "—"}</b> dentro de 2 años y <b>≈ {primary.resale3 != null ? eur(primary.resale3) : "—"}</b> dentro de 3.
      </p>

      {result.expertFlags.length ? (
        <div className="panel dashed">
          <div className="kick white">Lo que pides, frente a tu uso</div>
          <div className="traps" style={{ marginTop: 8 }}>
            {result.expertFlags.map((flag) => (
              <p key={flag} className="trap">{flag}</p>
            ))}
          </div>
        </div>
      ) : null}

      {result.notNeeded.length ? (
        <div className="panel dashed">
          <div className="kick white">Lo que NO necesitas</div>
          <div className="stack tight" style={{ marginTop: 8 }}>
            {result.notNeeded.map((entry) => (
              <p key={entry.text} className="note">
                {entry.text}
                {entry.savingEUR ? <> Te ahorras <b>≈ {eur(entry.savingEUR)}</b>.</> : null}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {result.stepUp ? (
        <div className="panel">
          <div className="kick">¿Compensa subir un escalón?</div>
          <p className="note" style={{ marginTop: 6 }}>{result.stepUp.text}</p>
        </div>
      ) : null}

      {result.gaming ? (
        <div className="panel">
          <div className="kick">Jugar en Mac, sin rodeos</div>
          <p className="note" style={{ marginTop: 6 }}>{result.gaming}</p>
        </div>
      ) : null}

      {result.intelWarning ? (
        <div className="panel" style={{ borderColor: "var(--y)" }}>
          <div className="kick" style={{ color: "var(--y)" }}>Ojo: Intel</div>
          <p className="note" style={{ marginTop: 6 }}>{INTEL_DISCLAIMER}</p>
        </div>
      ) : null}

      {primary.traps.length ? (
        <div>
          <h3 className="h2">Antes de comprar este</h3>
          <Traps traps={primary.traps} />
        </div>
      ) : null}

      {result.need.notes.length || result.need.reasons.length ? (
        <div>
          <h3 className="h2">Por qué esto</h3>
          <div className="stack tight">
            {[...result.need.reasons, ...result.need.notes].map((text) => (
              <p key={text} className="note">{text}</p>
            ))}
          </div>
        </div>
      ) : null}

      {result.alternatives.length ? (
        <div>
          <h3 className="h2">Otras opciones</h3>
          {result.alternatives.map((alt) => (
            <AltRow key={alt.label} label={alt.label} offer={alt.offer} href={modelHref(alt.offer.item, alt.offer.ramGB, alt.offer.storageIndex)} />
          ))}
        </div>
      ) : null}

      <div>
        <h3 className="h2">Qué significa cada cosa</h3>
        <Explain term="ram" uses={uses} open={answers.mode === "novato"} label={`Memoria: ${configLabel(primary).split(" · ")[0]}`} />
        <Explain term="ssd" uses={uses} label={`Almacenamiento: ${configLabel(primary).split(" · ")[1]}`} />
        <Explain term="chip" uses={uses} label={`Chip: ${primary.item.chip}`} />
        <Explain term="semaforo" />
        <Explain term="amortizacion" />
        <Explain term="precio" />
        {primary.source === "particular" ? <Explain term="particular" /> : null}
      </div>

      <div className="linklist">
        <Link href={modelHref(primary.item, primary.ramGB, primary.storageIndex)}>
          Ver la ficha completa <span className="mono">FICHA →</span>
        </Link>
        <Link href={`/comparar?ids=${[primary.item.id, ...result.alternatives.slice(0, 2).map((alt) => alt.offer.item.id)].join(",")}`}>
          Comparar con las otras opciones <span className="mono">LADO A LADO →</span>
        </Link>
        <Link href="/checklist">
          Comprar usado sin sustos <span className="mono">CHECKLIST →</span>
        </Link>
        <button type="button" onClick={onRestart}>
          Empezar de nuevo <span className="mono">↺</span>
        </button>
      </div>
    </div>
  );
}
