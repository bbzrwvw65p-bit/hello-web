"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { HelpBar } from "@/components/help-bar";
import { getItem } from "@/lib/catalog";
import { eur, FAMILY_ICON, formatWhen, generationEs, modelTitle, ramLabel, storageLabel } from "@/lib/format";
import { appleCareLabel, batteryLabel, defectLabel, gradeLabel, marketValue, parseState, priceDataset, stateQuery, type ChannelQuote } from "@/lib/market";
import { asset } from "@/lib/paths";
import { DonateButton } from "@/components/donate";
import { EstimateNote, LifecyclePanel } from "@/components/ui";
import { resaleIn } from "@/lib/economics";
import { lifecycle } from "@/lib/lifecycle";

/** Sin nombres de tiendas: la app no manda a nadie a ningún sitio. */
function neutral(text: string): string {
  return text
    .replace(/Apple Reacondicionado( España| en España)?/g, "el reacondicionado oficial")
    .replace(/ No hay ventas cerradas de Wallapop ni de eBay en los datos\./g, "")
    .replace(/en Wallapop y en tiendas/g, "los compradores y las tiendas");
}

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
  const fromFlow = params.get("g") != null;
  const ramValue = Number.isFinite(ram) && ram > 0 ? ram : item.ramGB;
  const confidenceText = { alta: "alta", media: "media", baja: "baja", modelo: "orientativa (sin anuncios iguales)" } as const;
  const asOf = new Date(`${priceDataset.observedOn}T12:00:00Z`);
  const valuation = storage ? marketValue(item, ramValue, storage, state, asOf) : null;
  const launch = item.launchPriceEUR;
  const life = lifecycle(item, asOf);
  const storageIdx = storage ? item.storageOptions.indexOf(storage) : 0;
  const resale2 = resaleIn(item, ramValue, storageIdx, 2, asOf);
  const resale3 = resaleIn(item, ramValue, storageIdx, 3, asOf);

  return (
    <main className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src={asset(FAMILY_ICON[item.family])} alt="" width={88} height={56} style={{ objectFit: "contain" }} />
        <HelpBar message="Cada precio es un rango: el típico en grande y, debajo, el suelo y el techo. «Vender a un particular» es lo que puedes pedir en un anuncio entre particulares; «Vender a una tienda», lo que suele ofrecer una recompra; «Comprar reacondicionado», lo que cuesta uno revisado y con garantía." />
      </div>
      <h1 className="question" style={{ marginBottom: 8 }}>{modelTitle(item)}</h1>
      <p className="note" style={{ textAlign: "center" }}>
        {generationEs(item.generation)} · {item.cpu}
      </p>
      <div className="chip-row" style={{ margin: "14px 0" }}>
        <span className="chip">{ramLabel(ramValue)}</span>
        <span className="chip">{storage ? storageLabel(storage.gb, storage.label) : "Disco"}</span>
        <span className="chip">{gradeLabel(state.grade)}</span>
        {item.formFactor === "portable" && fromFlow ? <span className="chip">{batteryLabel(state.batteryHealth)}</span> : null}
        {state.appleCareMonths > 0 ? <span className="chip">{appleCareLabel(state.appleCareMonths)}</span> : null}
        {state.defects.map((defect) => (
          <span key={defect} className="chip">{defectLabel(defect)}</span>
        ))}
      </div>

      {valuation ? (
        <div className="choices">
          <p className="note" style={{ textAlign: "center" }}>
            Confianza {confidenceText[valuation.confidence]} · {valuation.comparableCount === 0 ? "" : valuation.comparableCount === 1 ? "1 anuncio igual · " : `${valuation.comparableCount} anuncios iguales · `}{formatWhen(asOf.toISOString())}
          </p>
          <Channel title="Vender a un particular" detail="Lo que puedes pedir, con el estado que has marcado." quote={valuation.privateSell} light />
          <Channel title="Vender a una tienda" detail="Lo que suele pagar una tienda de recompra: menos, pero al momento." quote={valuation.buyback} />
          <Channel title="Comprar reacondicionado" detail="Lo que cuesta uno revisado, con garantía." quote={valuation.refurbishedBuy} light />
          <p className="note">
            Referencia: precios públicos de reacondicionado oficial en España, {formatWhen(asOf.toISOString())}. Se revisan cada día.
          </p>
          <ul className="note">
            {valuation.notes.map((note) => (
              <li key={note}>{neutral(note)}</li>
            ))}
          </ul>
          {!fromFlow ? (
            <p className="note">Calculado para un equipo en muy buen estado, con caja, cargador y factura. Ajusta el estado para afinar la cifra.</p>
          ) : null}
          <Link href={`/valorar?id=${item.id}&ram=${ramValue}&si=${storage ? item.storageOptions.indexOf(storage) : 0}&${stateQuery(state)}`} className="ios-choice compact">
            {fromFlow ? "Cambiar el estado" : "Ajustar el estado"}
          </Link>
          {valuation.comparables.length ? (
            <div>
              <h2 className="question" style={{ fontSize: 20 }}>Comparables</h2>
              {valuation.comparables.map((comparable) => (
                <div key={comparable.url + comparable.priceEUR} className="list-row">
                  <img src={asset(FAMILY_ICON[item.family])} alt="" />
                  <span>
                    <strong>{eur(comparable.priceEUR)}</strong> {comparable.title}
                    <br />
                    <span className="note">
                      {comparable.exact ? "Misma configuración" : "Parecido"} · reacondicionado oficial · {formatWhen(comparable.observedOn)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="note">De este modelo no hay precio de lanzamiento en España contrastado ni anuncios con los que compararlo, así que no damos una cifra inventada.</p>
      )}

      <div className="panels" style={{ marginTop: 16 }}>
        <LifecyclePanel life={life} />
        <div className="panel">
          <div className="kick">Reventa</div>
          <div className="big-num">{resale2 != null ? <>≈{resale2}<small> €</small></> : "—"}</div>
          <p className="est">Lo que valdrá entre particulares dentro de 2 años; en 3, ≈ {resale3 != null ? eur(resale3) : "—"}.</p>
        </div>
      </div>
      <EstimateNote />
      {launch != null ? <p className="note" style={{ marginTop: 10 }}>Salió a {eur(launch)}.</p> : null}
      <div className="choices" style={{ marginTop: 16 }}>
        <Link href={`/modelo?id=${item.id}&ram=${ramValue}&si=${storage ? item.storageOptions.indexOf(storage) : 0}`} className="ios-choice compact">Ver la ficha: vida útil y amortización</Link>
        <Link href="/valorar" className="ios-choice compact">Valorar otro Mac</Link>
      </div>
      <DonateButton />
    </main>
  );
}
