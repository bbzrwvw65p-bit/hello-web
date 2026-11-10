"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BackButton, ChoiceButton } from "@/components/choice";
import { getCatalog } from "@/lib/catalog";
import { eur, FAMILY_ICON, generationEs, modelTitle } from "@/lib/format";
import { asset } from "@/lib/paths";
import { recommend } from "@/lib/recommend";
import type { RecommendAnswers } from "@/lib/types";

const catalog = getCatalog();

type Step = "form" | "use" | "screen" | "uhd" | "ports" | "usbc" | "condition" | "profile" | "budget" | "result";

const initial: RecommendAnswers = {
  formFactor: "portable",
  mobility: "unsure",
  desktopUse: "aio",
  bigScreen: "unsure",
  uhd: "unsure",
  manyPorts: "no",
  usbC: "unsure",
  condition: "new",
  profile: "personal",
  budget: 0,
};

const presets = [900, 1200, 1800, 2500];

export default function RecomendarPage() {
  const [step, setStep] = useState<Step>("form");
  const [answers, setAnswers] = useState<RecommendAnswers>(initial);
  const [budgetText, setBudgetText] = useState("");
  const [budgetError, setBudgetError] = useState("");

  const order: Step[] = ["form", "use", "screen", "uhd", "ports", "usbc", "condition", "profile", "budget", "result"];

  const result = useMemo(() => {
    if (step !== "result") return null;
    return recommend(catalog, answers, new Date());
  }, [step, answers]);

  function patch(partial: Partial<RecommendAnswers>, next: Step) {
    setAnswers((current) => ({ ...current, ...partial }));
    setStep(next);
  }

  function back() {
    const index = order.indexOf(step);
    if (index > 0) setStep(order[index - 1]);
  }

  function submitBudget(raw = budgetText) {
    const value = Number(raw.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value) || value < 50) {
      setBudgetError("Escribe un presupuesto en euros, a partir de 50.");
      return;
    }
    setBudgetText(String(value));
    setBudgetError("");
    patch({ budget: value }, "result");
  }

  const titles: Record<Step, string> = {
    form: "¿Portátil o de escritorio?",
    use: answers.formFactor === "portable" ? "¿Cuánto lo vas a mover?" : "¿Lo quieres con pantalla?",
    screen: "¿Quieres pantalla grande?",
    uhd: "¿La quieres muy nítida?",
    ports: "¿Le conectas muchas cosas?",
    usbc: "¿Te vale USB-C?",
    condition: "¿Nuevo o de segunda mano?",
    profile: "¿Para qué lo vas a usar?",
    budget: "¿Cuánto quieres gastar?",
    result: "Tus opciones",
  };

  return (
    <main className="screen">
      <h1 className="question">{titles[step]}</h1>
      {step !== "form" ? <BackButton onClick={back} /> : null}
      <div className="choices">
        {step === "form" && (
          <>
            <ChoiceButton image="/hello/macbook-pro.png" title="Portátil" detail="Lo vas a mover, o al menos a cerrar la tapa." onClick={() => patch({ formFactor: "portable" }, "use")} />
            <ChoiceButton image="/hello/imac.png" title="De escritorio" detail="Se queda en la mesa." onClick={() => patch({ formFactor: "desktop" }, "use")} />
          </>
        )}
        {step === "use" && answers.formFactor === "portable" && (
          <>
            <ChoiceButton image="/hello/feather.png" title="El más ligero" detail="Mochila, clase, café." onClick={() => patch({ mobility: "light" }, "screen")} />
            <ChoiceButton image="/hello/screen.png" title="Uno con potencia" detail="Vídeo, código, diseño." onClick={() => patch({ mobility: "power" }, "screen")} />
            <ChoiceButton title="Me da igual" onClick={() => patch({ mobility: "unsure" }, "screen")} />
          </>
        )}
        {step === "use" && answers.formFactor === "desktop" && (
          <>
            <ChoiceButton image="/hello/imac.png" title="Todo en uno" detail="Pantalla incluida." onClick={() => patch({ desktopUse: "aio" }, "screen")} />
            <ChoiceButton image="/hello/mac-mini.png" title="A un monitor o un televisor" detail="Sin pantalla propia." onClick={() => patch({ desktopUse: "external" }, "screen")} />
          </>
        )}
        {step === "screen" && (
          <>
            <ChoiceButton title="Sí, cuanto más grande mejor" onClick={() => patch({ bigScreen: "yes" }, "uhd")} />
            <ChoiceButton title="No, prefiero algo contenido" onClick={() => patch({ bigScreen: "no" }, "uhd")} />
            <ChoiceButton title="Me da igual" onClick={() => patch({ bigScreen: "unsure" }, "uhd")} />
          </>
        )}
        {step === "uhd" && (
          <>
            <ChoiceButton title="Sí, Retina o mejor" onClick={() => patch({ uhd: "yes" }, "ports")} />
            <ChoiceButton title="No hace falta" onClick={() => patch({ uhd: "no" }, "ports")} />
            <ChoiceButton title="Me da igual" onClick={() => patch({ uhd: "unsure" }, "ports")} />
          </>
        )}
        {step === "ports" && (
          <>
            <ChoiceButton image="/hello/cables.png" title="Sí" detail="Monitores, discos, dongles." onClick={() => patch({ manyPorts: "yes" }, "usbc")} />
            <ChoiceButton title="Con un par de cables me apaño" onClick={() => patch({ manyPorts: "no" }, "usbc")} />
          </>
        )}
        {step === "usbc" && (
          <>
            <ChoiceButton image="/hello/usbc.png" title="Sí, USB-C" onClick={() => patch({ usbC: "yes" }, "condition")} />
            <ChoiceButton title="Prefiero los enchufes de siempre" detail="USB-A, MagSafe antiguo, ranura SD." onClick={() => patch({ usbC: "no" }, "condition")} />
            <ChoiceButton title="Me da igual" onClick={() => patch({ usbC: "unsure" }, "condition")} />
          </>
        )}
        {step === "condition" && (
          <>
            <ChoiceButton title="Nuevo" detail="Precio de lanzamiento en Apple España." onClick={() => patch({ condition: "new" }, "profile")} />
            <ChoiceButton title="De segunda mano" detail="Precio de Apple Reacondicionado, con fecha." onClick={() => patch({ condition: "used" }, "profile")} />
          </>
        )}
        {step === "profile" && (
          <>
            <ChoiceButton title="Día a día" detail="Clase, correo, fotos, Safari." onClick={() => patch({ profile: "personal" }, "budget")} />
            <ChoiceButton title="Trabajo exigente" detail="Vídeo, desarrollo, música, diseño." onClick={() => patch({ profile: "pro" }, "budget")} />
          </>
        )}
        {step === "budget" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              submitBudget();
            }}
          >
            <p className="note">Euros. Puedes usar uno de estos o escribir el tuyo.</p>
            <div className="split">
              {presets.map((preset) => (
                <button key={preset} type="button" className={budgetText === String(preset) ? "ios-choice compact on" : "ios-choice compact"} onClick={() => { setBudgetText(String(preset)); setBudgetError(""); }}>
                  {eur(preset)}
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="budget">
              Tu presupuesto
              <input id="budget" className="field" inputMode="numeric" placeholder="1200" value={budgetText} onChange={(event) => setBudgetText(event.target.value)} aria-invalid={Boolean(budgetError)} />
            </label>
            {budgetError ? <p className="note">{budgetError}</p> : null}
            <button type="submit" className="ios-choice glow">
              Ver recomendaciones
            </button>
          </form>
        )}

        {step === "result" && result && (
          <>
            {result.relaxed ? <p className="note">{result.relaxed}</p> : null}
            {result.suggestions.length === 0 ? (
              <div className="price-box">
                <p className="amount" style={{ fontSize: 26 }}>Presupuesto corto</p>
                <p className="range">
                  {result.minimumEUR
                    ? `Con estas respuestas, lo más barato que sigue teniendo macOS 27 ronda los ${eur(result.minimumEUR)}.`
                    : "No hay un Mac actual con estas condiciones."}
                </p>
                <button type="button" className="ios-choice compact on-light" style={{ marginTop: 12 }} onClick={() => setStep("budget")}>
                  Cambiar presupuesto
                </button>
              </div>
            ) : (
              result.suggestions.map((suggestion) => (
                <article key={`${suggestion.role}-${suggestion.item.id}`} className={suggestion.role === "encaja" ? "rec-card primary" : "rec-card"}>
                  <p className="role">{suggestion.roleTitle}</p>
                  <img className="model" src={asset(FAMILY_ICON[suggestion.item.family])} alt="" />
                  <h2>{modelTitle(suggestion.item)}</h2>
                  <p>
                    {generationEs(suggestion.item.generation)} · {suggestion.item.chip}
                    <br />
                    {suggestion.configLabel}
                  </p>
                  <p className="amount">{eur(suggestion.priceEUR)}</p>
                  <p className="note">
                    {suggestion.priceKind === "nuevo" ? "Nuevo" : "Reacondicionado"} · {suggestion.priceDate}
                    <br />
                    {suggestion.priceSource}
                  </p>
                  <p>{suggestion.why}</p>
                  <p className="note">{suggestion.tradeoff}</p>
                  <Link className="ios-choice" href={`/resultado?id=${suggestion.item.id}&ram=${suggestion.ramGB}&si=${suggestion.storageIndex}`}>
                    Abrir la ficha
                  </Link>
                </article>
              ))
            )}
            <button type="button" className="ios-choice" onClick={() => setStep("form")}>
              Empezar de nuevo
            </button>
          </>
        )}
      </div>
    </main>
  );
}
