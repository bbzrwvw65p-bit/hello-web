import Link from "next/link";
import { asset } from "@/lib/paths";

export const metadata = { title: "Acerca de" };

export default function AcercaPage() {
  return (
    <main className="screen">
      <div className="word-xl" style={{ fontSize: 52, margin: "6px 0 10px" }}>
        hello<span className="dot" />
      </div>
      <img src={asset("/hello/thedotapps.png")} alt="thedotapps" style={{ width: 120, display: "block", margin: "0 0 16px", filter: "invert(1)" }} />
      <section className="panel">
        <p className="note">Idea original, diseño y análisis de datos: Joel Rodríguez. hello. fue su app de iPhone entre 2017 y 2019.</p>
      </section>
      <div className="copy">
        <p style={{ marginTop: 16 }}>
          Esta web es un sucesor independiente. No está afiliada a Apple ni a thedotapps. El catálogo Intel sale de los CSV de la versión 9.4.8. A partir de ahí se han añadido los Mac que Apple ha puesto a la venta hasta noviembre de 2026, con el precio de lanzamiento en euros para España cuando la fuente lo sostiene.
        </p>

        <h2>La idea</h2>
        <p>
          Recomendar lo que de verdad necesitas, no lo más caro. Casi siempre eso es un Mac de segunda mano bien elegido. hello. no te manda a ninguna tienda: te da precios orientativos y te explica qué significa cada cosa.
        </p>

        <h2>Cómo tasa</h2>
        <p>
          El punto de partida son los precios públicos de reacondicionado oficial en España, con chip, memoria, disco y precio. La memoria y el disco se valoran como los paga el mercado: doblar la RAM ronda un 32 % y doblar el SSD un 18 %. Un Mac que ya no se vende no se paga más que una parte del modelo nuevo que lo sustituye.
        </p>
        <p>
          El estado, la batería, la garantía, el cargador, la caja, la factura y los defectos mueven lo que pagarían un particular o una tienda. Un bloqueo de iCloud o de empresa lo deja en precio de piezas. La web no consulta precios en el momento: usa un archivo que se actualiza cada día.
        </p>

        <h2>Vida útil y amortización</h2>
        <p>
          macOS 27 Golden Gate (septiembre de 2026) solo funciona en Mac con chip de Apple. macOS 26 Tahoe es el último para Intel, con unos tres años de parches de seguridad. Para los chips de Apple, la última gran versión y el fin de los parches son estimaciones a partir de cómo lo ha hecho Apple hasta ahora: unas 7 versiones grandes por generación y unos 2 años de parches después.
        </p>
        <p>
          El coste por año es lo que pagas menos lo que recuperarás al venderlo, repartido entre los años con soporte que le quedan, más un pequeño coste por las novedades de macOS que ya no le llegarán. Para el siguiente Mac se cuenta con que Apple suba precios, ≈ 3 % al año.
        </p>

        <h2>Qué no inventa</h2>
        <p>
          Si un modelo es real pero su precio español no quedó contrastado, el catálogo lo lista y la tasación se niega a poner una cifra. Las cifras de segunda mano son orientativas y en rangos.
        </p>

        <h2>En el iPhone</h2>
        <p>
          En Safari, Compartir y luego «Añadir a pantalla de inicio». Se abre a pantalla completa, como una app.
        </p>
      </div>
      <div className="linklist">
        <Link href="/checklist">Comprar usado sin sustos <span className="mono">CHECKLIST →</span></Link>
      </div>
    </main>
  );
}
