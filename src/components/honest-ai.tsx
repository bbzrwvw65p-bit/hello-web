/** La mención a la IA, sin exagerar: el diseño y el código se hicieron con IA; las cuentas son fórmulas. */
export const HONEST_AI_LINE = "Diseñada y programada con IA. Las cuentas no las hace una IA: son fórmulas a la vista y precios reales que se actualizan cada mañana. Cero humo.";

export function HonestAi({ style }: { style?: React.CSSProperties }) {
  return (
    <p className="honest-ai" style={style}>
      <span className="mono">IA</span>
      <span>{HONEST_AI_LINE}</span>
    </p>
  );
}
