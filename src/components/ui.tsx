"use client";

import Link from "next/link";
import { configLabel, SOURCE_LABEL, type Offer } from "@/lib/advisor";
import type { Amortisation, Channels } from "@/lib/economics";
import { eur, FAMILY_ICON, modelTitle } from "@/lib/format";
import { explain, type TermId, type Use } from "@/lib/glossary";
import { ESTIMATE_NOTE, type Lifecycle } from "@/lib/lifecycle";
import { asset } from "@/lib/paths";
import type { Trap } from "@/lib/traps";
import type { CatalogItem } from "@/lib/types";

export function Explain({ term, uses = [], label, open }: { term: TermId; uses?: Use[]; label?: string; open?: boolean }) {
  const entry = explain(term, uses);
  return (
    <details className="explain" open={open}>
      <summary>
        <span>{label ?? entry.title}</span>
        <span className="q">¿QUÉ SIGNIFICA?</span>
      </summary>
      <div className="body">
        {entry.text}
        {entry.forYou ? (
          <>
            {" "}
            <b>Para ti:</b> {entry.forYou}
          </>
        ) : null}
      </div>
    </details>
  );
}

export function Light({ light, small }: { light: Lifecycle["light"]; small?: boolean }) {
  const order: Lifecycle["light"][] = ["verde", "amarillo", "rojo"];
  return (
    <div className={small ? "light small" : "light"} aria-label={`Semáforo ${light}`}>
      {order.map((value) => (
        <i key={value} className={value === light ? value : ""} />
      ))}
    </div>
  );
}

function yearLabel(value: number): string {
  return `${Math.floor(value)}`;
}

export function LifecyclePanel({ life }: { life: Lifecycle }) {
  return (
    <div className="panel">
      <div className="kick">Vida útil</div>
      <Light light={life.light} />
      <h4>{life.lightLabel}</h4>
      <dl className="kv">
        <dt>Hoy</dt>
        <dd>{life.receivesCurrent ? "macOS 27" : life.latestLabel}</dd>
        <dt>Intelligence</dt>
        <dd>{life.appleIntelligence ? "Sí" : "No"}</dd>
        <dt>Última grande</dt>
        <dd>{life.lastMajorEstimated ? `≈ ${life.lastMajorYear}*` : `${life.lastMajorYear}`}</dd>
        <dt>Seguridad</dt>
        <dd>{life.light === "rojo" ? "Terminada" : `≈ ${yearLabel(life.securityEnd)}*`}</dd>
      </dl>
    </div>
  );
}

export function AmortPanel({ amort }: { amort: Amortisation }) {
  const lost = Math.max(0, amort.pricePaid - amort.resale);
  const total = Math.max(1, amort.pricePaid + amort.erosionPerYear * amort.usableYears);
  return (
    <div className="panel">
      <div className="kick">Amortización</div>
      <div className="big-num">
        ≈{amort.perYear}
        <small> €/año</small>
      </div>
      <div className="bar" aria-hidden>
        <i style={{ flex: lost / total, background: "var(--g)" }} />
        <i style={{ flex: (amort.erosionPerYear * amort.usableYears) / total, background: "var(--y)" }} />
        <i style={{ flex: amort.resale / total, background: "rgba(255,255,255,.25)" }} />
      </div>
      <dl className="kv">
        <dt>Pagas</dt>
        <dd>{eur(amort.pricePaid)}</dd>
        <dt>Vale en {String(amort.usableYears).replace(".", ",")} años</dt>
        <dd>≈ {eur(amort.resale)}</dd>
      </dl>
      <p className="est" style={{ marginTop: 6 }}>
        {amort.shortLife ? "Le queda menos soporte del que quieres: se reparte en menos años. " : ""}Ya cuenta la reventa y las novedades de macOS que no le llegarán.
      </p>
    </div>
  );
}

export function PriceRows({ channels, best }: { channels: Channels; best?: keyof Channels }) {
  const rows: { key: keyof Channels; label: string }[] = [
    { key: "nuevo", label: "Nuevo" },
    { key: "reacondicionado", label: "Reacondicionado" },
    { key: "particular", label: "Usado, de particular" },
  ];
  return (
    <div className="price-rows">
      {rows.map((row) => {
        const quote = channels[row.key];
        const text = !quote ? "—" : quote.low === quote.high ? eur(quote.typical) : `${eur(quote.low).replace(/\s?€/, "")}–${eur(quote.high)}`;
        return (
          <div key={row.key} className={!quote ? "na" : row.key === best ? "best" : ""}>
            <span>{row.label}</span>
            <span className="v">{text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Traps({ traps }: { traps: Trap[] }) {
  if (!traps.length) return null;
  return (
    <div className="traps">
      {traps.map((trap) => (
        <p key={trap.text} className={`trap ${trap.level}`}>
          {trap.text}
        </p>
      ))}
    </div>
  );
}

export function EstimateNote() {
  return <p className="est">* {ESTIMATE_NOTE}</p>;
}

export function OfferHead({ item, kicker, sub }: { item: CatalogItem; kicker: string; sub?: string }) {
  return (
    <>
      <div className="kick">{kicker}</div>
      <div className="card-head">
        <h2>
          {modelTitle(item).replace(item.name, "").trim() ? (
            <>
              {item.name} <b>{item.chip}</b>
              <br />
              {item.sizeLabel !== "—" ? `${item.sizeLabel} · ` : ""}
              {item.year}
            </>
          ) : (
            <>
              {item.name} <b>{item.chip}</b>
              <br />
              {item.year}
            </>
          )}
        </h2>
        <img src={asset(FAMILY_ICON[item.family])} alt="" />
      </div>
      {sub ? <div className="spec">{sub}</div> : null}
    </>
  );
}

export function offerSpecLine(offer: Offer): string {
  const weight = offer.specs.weightKg != null && offer.item.formFactor === "portable" ? ` · ${String(offer.specs.weightKg).replace(".", ",")} KG` : "";
  return `${configLabel(offer).replace(" · ", " RAM · ")} SSD${weight}`.toUpperCase();
}

export function AltRow({ label, offer, href }: { label: string; offer: Offer; href?: string }) {
  const body = (
    <>
      <img src={asset(FAMILY_ICON[offer.item.family])} alt="" />
      <div>
        <div className="kick">{label}</div>
        <h4>
          {offer.item.name} {offer.item.chip} {offer.item.sizeLabel !== "—" ? offer.item.sizeLabel : ""}
        </h4>
        <p>
          {configLabel(offer)} · {offer.item.year} · {SOURCE_LABEL[offer.source].toLowerCase()}
        </p>
        <Light light={offer.life.light} small />
      </div>
      <div className="v">
        ≈ {eur(offer.priceEUR)}
        <small>≈ {offer.amort.perYear} €/año</small>
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="alt">
      {body}
    </Link>
  ) : (
    <div className="alt">{body}</div>
  );
}

export function modelHref(item: CatalogItem, ramGB?: number, storageIndex?: number): string {
  const params = new URLSearchParams({ id: item.id });
  if (ramGB) params.set("ram", String(ramGB));
  if (storageIndex) params.set("si", String(storageIndex));
  return `/modelo?${params.toString()}`;
}
