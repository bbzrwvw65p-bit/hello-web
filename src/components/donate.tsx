import { PAYPAL_URL } from "@/config/site";

/** Botón discreto de donación. Si PAYPAL_URL está vacío no se pinta nada. */
export function DonateButton({ style }: { style?: React.CSSProperties }) {
  if (!PAYPAL_URL.trim()) return null;
  return (
    <a className="cta glow donate" href={PAYPAL_URL} target="_blank" rel="noopener noreferrer" style={style}>
      <span>Invítame a un café</span>
      <span className="mono">PAYPAL ↗</span>
    </a>
  );
}

/** Sección «Invítame a un café» para Acerca de. Oculta mientras no haya enlace. */
export function DonateSection() {
  if (!PAYPAL_URL.trim()) return null;
  return (
    <section className="panel dashed" style={{ marginTop: 22 }}>
      <div className="kick white">Invítame a un café</div>
      <p className="note" style={{ marginTop: 8 }}>
        hello. es gratis, sin anuncios y sin comisiones de ninguna tienda. Si te ha ahorrado dinero o un disgusto y quieres echar una mano, un café ayuda a mantenerla.
      </p>
      <DonateButton />
    </section>
  );
}
