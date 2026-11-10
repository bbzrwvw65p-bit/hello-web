"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { HelpBar } from "@/components/help-bar";
import { getItem } from "@/lib/catalog";
import { eur, FAMILY_ICON, formatWhen, generationEs, modelTitle, ramLabel, storageLabel } from "@/lib/format";
import { appleCareLabel, gradeLabel, marketValue, parseState, priceDataset, type ChannelQuote } from "@/lib/market";
import { asset } from "@/lib/paths";

function Channel({ title, detail, quote, light }: { title: string; detail: string; quote: ChannelQuote; light?: boolean }) {
  return (
    <section className="price-box" style={light ? undefined : { background: "transparent", color: "#fff", border: "1px solid #fff" }}>
      <p className="kicker">{title}</p>
      <p className="amount">{eur(quote.typical)}</p>
      <p className="range">
        {eur(quote.low)} – {eur(quote.high)}
      </p>
      <p className="kicker">{detail}</p>
    </section>
  );
}

export function ResultadoView() {
  const params = useSearchParams();
  const id = params.get("id");
  const item = id ? getItem(id) : null;
  if (!item) notFound();

  const ram = Number(params.get("ram") ?? item.ramGB);
  const storageIndex = Number(params.get("si") ?? "0");
  const storage = item.storageOptions[Number.isFinite(storageIndex) ? storageIndex : 0] ?? item.storageOptions[0];
  const state = parseState(params);
  if (item.formFactor === "desktop") state.batteryHealth = null;
  const asOf = new Date(`${priceDataset.observedOn}T12:00:00Z`);
  const valuation = storage ? marketValue(item, Number.isFinite(ram) ? ram : item.ramGB, storage, state, asOf) : null;
  const launch = item.launchPriceEUR;

  return (
    <main className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src={asset(FAMILY_ICON[item.family])} alt="" width={88} height={56} style={{ objectFit: "contain" }} />
        <HelpBar message="El rango es una aproximación de un ordenador que enciende y está cuidado. Desconfía de precios mucho más bajos. La batería, los ciclos y un golpe cambian la cifra." />
      </div>
      <h1 className="question" style={{ marginBottom: 8 }}>{modelTitle(item)}</h1>
      <p className="note" style={{ textAlign: "center" }}>
        {generationEs(item.generation)} · {item.cpu}
      </p>
      <div className="chip-row" style={{ margin: "14px 0" }}>
        <span className="chip">{ramLabel(Number.isFinite(ram) ? ram : item.ramGB)}</span>
        <span className="chip">{storage ? storageLabel(storage.gb, storage.label) : "Disco"}</span>
        <span className="chip">{gradeLabel(state.grade)}</span>
        {state.batteryHealth != null ? <span className="chip">Batería {state.batteryHealth}%</span> : null}
        <span className="chip">{appleCareLabel(state.appleCareMonths)}</span>
      </div>

      {valuation ? (
        <div className="choices">
          <p className="note" style={{ textAlign: "center" }}>
            Confianza {valuation.confidence} · {valuation.comparableCount} comparables · {formatWhen(asOf.toISOString())}
          </p>
          <Channel title="Vender a un particular" detail="Lo que puedes pedir, con el estado que has marcado." quote={valuation.privateSell} light />
          <Channel title="Vender a una tienda" detail="Lo que suele pagar una recompra." quote={valuation.buyback} />
          <Channel title="Comprar reacondicionado" detail="Lo que pide Apple por uno certificado." quote={valuation.refurbishedBuy} light />
          <p className="note">
            Cifras del JSON empaquetado con la web: Apple Reacondicionado en España, {formatWhen(asOf.toISOString())}. No hay servidor. Un workflow diario vuelve a leer esa página y publica otra vez si el precio cambia.
          </p>
          <ul className="note">
            {valuation.notes.slice(0, 4).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {valuation.comparables.length ? (
            <div>
              <h2 className="question" style={{ fontSize: 20 }}>Comparables</h2>
              {valuation.comparables.map((comparable) => (
                <a key={comparable.url + comparable.priceEUR} className="list-row" href={comparable.url} target="_blank" rel="noreferrer">
                  <img src={asset(FAMILY_ICON[item.family])} alt="" />
                  <span>
                    <strong>{eur(comparable.priceEUR)}</strong> {comparable.title}
                    <br />
                    <span className="note">
                      {comparable.exact ? "Misma configuración" : "Parecido"} · {comparable.source} · {comparable.observedOn}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="note">Este modelo está en el catálogo, pero no hay un precio de lanzamiento contrastado. No inventamos la cifra.</p>
      )}

      {launch != null ? <p className="note">Salió a {eur(launch)}. {item.priceSource}</p> : null}
      <div className="choices" style={{ marginTop: 16 }}>
        <Link href="/valorar" className="ios-choice">Valorar otro Mac</Link>
      </div>
    </main>
  );
}
