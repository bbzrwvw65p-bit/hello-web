import Link from "next/link";

const MODES = [
  { mode: "novato", n: "01", title: "Ni idea, ayúdame", detail: "Te pregunto como un amigo. Sin chips ni gigas." },
  { mode: "normal", n: "02", title: "Algo sé", detail: "Uso, pantalla, puertos y presupuesto." },
  { mode: "experto", n: "03", title: "Sé lo que quiero", detail: "Eliges chip, RAM y SSD. Yo busco el más barato que tenga sentido." },
];

export default function HomePage() {
  return (
    <main className="screen" style={{ paddingTop: 22 }}>
      <div className="kick">Mac · España · Precios en €</div>
      <div className="word-xl" style={{ margin: "14px 0" }}>
        hello<span className="dot" />
      </div>
      <p className="lede">
        El Mac que <b>de verdad</b> necesitas. Y casi siempre, <b>de segunda mano</b>.
      </p>
      <div className="between" style={{ margin: "30px 0 12px" }}>
        <span className="kick white">¿Cuánto sabes de Mac?</span>
        <span className="kick">3 modos</span>
      </div>
      <div className="stack tight">
        {MODES.map((entry, index) => (
          <Link key={entry.mode} href={`/recomendar?modo=${entry.mode}`} className={index === 0 ? "mode glow" : "mode"}>
            <span className="n">{entry.n}</span>
            <span>
              <h3>{entry.title}</h3>
              <p>{entry.detail}</p>
            </span>
            <span className="ar">→</span>
          </Link>
        ))}
      </div>
      <div className="linklist" style={{ marginTop: 20 }}>
        <Link href="/valorar">
          Valora mi Mac <span className="mono">TASAR →</span>
        </Link>
        <Link href="/mi-mac">
          ¿Cambiar o esperar? <span className="mono">MI MAC →</span>
        </Link>
        <Link href="/comparar">
          Comparar 2–3 Mac <span className="mono">LADO A LADO →</span>
        </Link>
        <Link href="/checklist">
          Comprar usado sin sustos <span className="mono">CHECKLIST →</span>
        </Link>
      </div>
    </main>
  );
}
