import type { Metadata } from "next";
import { asset } from "@/lib/paths";

export const metadata: Metadata = { title: "Acerca de" };

export default function AcercaPage() {
  return (
    <main className="screen">
      <img src={asset("/hello/hello-black.png")} alt="hello." style={{ width: 180, display: "block", margin: "0 auto 8px" }} />
      <img src={asset("/hello/thedotapps.png")} alt="thedotapps" style={{ width: 120, display: "block", margin: "0 auto 16px" }} />
      <h1 className="question">Acerca de hello.</h1>
      <section className="note wood" style={{ padding: 16, borderRadius: 5 }}>
        Idea original, diseño y análisis de datos: Joel Rodríguez. Programación y desarrollo: Antonio Linares. hello. fue su app de iPhone entre 2017 y 2019.
      </section>
      <div className="copy">
      <p>
        Esta web es un sucesor independiente. No está afiliada a Apple ni a thedotapps. El catálogo Intel sale de los CSV de la versión 9.4.8. A partir de ahí se han añadido los Mac que Apple ha puesto a la venta hasta el 2 de noviembre de 2026, M6 incluido, con el precio de lanzamiento en euros para España cuando la fuente lo sostiene.
      </p>

      <h2 className="question" style={{ fontSize: 22 }}>Cómo tasa</h2>
      <p>
        El número sale del escaparate de Apple Reacondicionado en España del 2 de noviembre de 2026, con chip, memoria, disco y precio. Un Air M5 de 16 GB y 512 GB sigue en 1.209 €. Un Pro de dos años ha bajado más. Los tres primeros años están medidos ahí. Después, la curva se empina y la confianza pasa a «modelo», porque no hay anuncios más viejos en esa foto.
      </p>
      <p>
        La memoria y el disco se valoran como los paga ese mercado, no como los cobraba Apple: doblar la RAM ronda un 32 % y doblar el SSD un 18 %. El color no cambia nada, se miró acabado por acabado. El teclado de mariposa y quedarse fuera de macOS 27 sí restan. El estado del equipo (como nuevo, muy bueno, bueno, aceptable), la batería, AppleCare, la caja, el idioma del teclado y los defectos mueven lo que pagarían un particular o una tienda.
      </p>
      <p>
        Verás tres rangos: vender a un particular, vender a una tienda y comprar reacondicionado. El tercero es el que tiene anuncios. Los otros dos salen de ese precio, un 16 % y luego un 32 % por debajo, porque Wallapop y Back Market no dejaron leer ventas cerradas. La web no consulta precios en el momento: usa el JSON empaquetado. En GitHub Pages, un workflow diario vuelve a leer Apple Reacondicionado en España y publica otra vez si cambia.
      </p>

      <h2 className="question" style={{ fontSize: 22 }}>Qué no inventa</h2>
      <p>
        Si un modelo es real pero el PVP español no quedó contrastado, el catálogo lo lista y la tasación se niega a poner una cifra. Pasa con algunos MacBook Pro Max y con el Mac Pro de 2023. El precio de lanzamiento no es el precio de hoy en la tienda: en junio de 2026 Apple subió la gama por la memoria, y hello. guarda el de salida.
      </p>

      <h2 className="question" style={{ fontSize: 22 }}>En el iPhone</h2>
      <p>
        En Safari, Comparte y luego “Añadir a pantalla de inicio”. El manifiesto, el icono y el service worker la dejan a pantalla completa. El nombre en el icono es hello.
      </p>
      </div>
    </main>
  );
}
