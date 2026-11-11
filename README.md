# hello.

Tasa un Mac de segunda mano y recomienda otro. Es el sucesor web de la app de iPhone **hello.** (thedotapps, 2017-2019): el mismo recorrido, con la tasación rehecha a partir del mercado de noviembre de 2026 y un catálogo que llega hasta esa fecha.

Pensada para el iPhone. En Safari: Compartir → Añadir a pantalla de inicio. El nombre del icono es hello.

## Qué hace

- **Valora mi Mac.** Portátil o escritorio, modelo, año, procesador, memoria, disco y estado. El resultado son tres precios: particular, tienda y reacondicionado.
- **Recomiéndame un Mac.** Uso, tamaño, portabilidad y presupuesto. Devuelve dos o tres opciones separadas de verdad: la que encaja, un ahorro (reacondicionado o un escalón por debajo) y, si compensa, un paso más. Cada una lleva un precio de esa configuración, la fuente y la fecha. No propone Intel ni un Mac sin macOS 27.
- **Catálogo.** Unas 400 configuraciones en `src/data/catalog.json`: el Intel de los CSV originales y los Mac con chip de Apple, del M1 al M6, incluido el MacBook Neo, el Mac Studio y los anunciados para el 6 de noviembre de 2026.

El precio de una recomendación nueva es el de lanzamiento en Apple España de esa configuración. El de segunda mano es la mediana de Apple Reacondicionado el 2 de noviembre de 2026, cuando hay al menos dos anuncios iguales. Si no hay anuncio, la ficha lo dice y usa la curva.

## Arrancar en local

Hace falta Node 20 o superior.

```bash
npm install
npm test
npm run dev
```

Abre [http://127.0.0.1:4317](http://127.0.0.1:4317).

`npm test` recorre el catálogo entero, contrasta la tasación con los precios observados y comprueba que el catálogo llega del Intel antiguo al M6.

Para regenerar el JSON a partir de los CSV:

```bash
npm run catalog
```

Los CSV están en `data/hello-csv/`. No los edites a mano si quieres poder repetir la importación: los modelos nuevos viven en `scripts/build_catalog.py`.

## Cómo se tasa

La cifra no sale de la fórmula de 2019. Sale de un dataset con fecha y de una curva ajustada a ese dataset.

El archivo `src/data/market/observations.json` guarda el escaparate público de [Apple Reacondicionado en España](https://www.apple.com/es/shop/refurbished/mac) del **2 de noviembre de 2026**: 67 Macs, con año, pulgadas, memoria, disco, color y precio en euros. Se regenera con `python3 scripts/fetch_observations.py`. Ese día el color no movía ni un euro: el mismo equipo en otro acabado valía igual.

Con esos pares se midió:

- Un Air M5 de 13″ con 16 GB y 512 GB se vende reacondicionado a **1.209 €**, frente a 1.199 € de lanzamiento (ocho meses).
- El de 15″, a **1.459 €** frente a 1.499 €.
- El MacBook Neo de 256 GB, a **679 €** frente a 699 €.
- El iMac M4 de 8 núcleos, a **1.439 €** frente a 1.519 € (dos años).
- El MacBook Pro 16″ M4 Pro con 24 GB y 512 GB, a **2.539 €** frente a 2.949 €.

De ahí la retención: los de consumo pierden alrededor de un 3,5 % al año los tres primeros años (`e^(-0,035·años)`); los Pro, Studio y Mac Pro, un 7 %. A partir del tercer año la pendiente sube, porque el dataset no tiene máquinas más viejas: esa cola es una extrapolación y la confianza baja a «modelo».

La memoria y el disco no suman lo que Apple cobró por ampliar. En el mismo escaparate, pasar de 16 a 24 GB o de 512 GB a 1 TB en el Air M5 sube el precio menos que el suplemento de la tienda. La curva usa elasticidad 0,40 en RAM y 0,24 en SSD: doblar la memoria es cerca de un +32 %, doblar el disco cerca de un +18 %, y eso también envejece con la máquina.

El soporte de macOS entra aparte. En noviembre de 2026, macOS 27 Golden Gate ya no admite ningún Intel. Los cuatro que se quedan en Tahoe (MacBook Pro 16″ de 2019, MacBook Pro 13″ de 2020 con cuatro puertos, iMac 27″ de 2020 y Mac Pro de 2019) solo tienen seguridad y se descuentan. El resto de Intel, más. El teclado de mariposa (MacBook 2015-2017, Air 2018-2019, Pro 13″ y 15″ de 2016-2019) resta otro 12 %. El de 16″ de 2019 no: ya era de tijera.

Desde la v2, para los Mac con chip de Apple descatalogados hay además un **techo por sucesor**: no valen más que una parte del modelo actual de la misma línea (88 % con una generación de diferencia, 80 % con dos, 74 % con tres, 66 % con cuatro…), ajustada por memoria y disco. Sin él, un Air M2 (1.519 € de salida) salía más caro que un Air M5 nuevo. Si un modelo no tiene PVP español contrastado, se usa el anuncio igual de Apple Reacondicionado o, si no hay, el PVP más bajo de un hermano de la misma línea a tres años o menos, con confianza baja. El chip solo cuenta como Apple silicon si el Mac es de 2020 o posterior: en los CSV, el Core m3/m5/m7 y algunos Intel de 2015 traían «M3» o «m5» en ese campo.

Cada tasación pide la configuración exacta y el estado: aspecto (como nuevo, muy bueno, bueno o aceptable, con una frase que lo explica); salud de la batería o «no lo sé» y ciclos; garantía o AppleCare+ que quede; cargador (o teclado y ratón en un iMac), caja y factura por separado; teclado español u otro; vidrio nanotexturizado si el modelo lo tenía; y defectos (golpes, marcas o rotura de pantalla, teclado, puertos, líquidos, placa y bloqueo de iCloud o MDM). El acabado se puede ignorar. Desde la ficha se puede volver a cambiar el estado sin repetir el modelo.

El recomendador pregunta: portátil o escritorio; con o sin monitor (escritorio); uso (día a día, exigente, muy exigente); tamaño (portátil); si necesita HDMI o SD (portátil); nuevo, reacondicionado o me da igual; y presupuesto. Si Apple no tiene un modelo reacondicionado, propone el usado entre particulares con precio estimado y lo marca así.

Tres precios, cada uno con suelo, típico y techo:

- **Comprar reacondicionado.** Anclado a los anuncios iguales. Si hay dos o más, el rango es el mínimo y el máximo de esos anuncios.
- **Vender a un particular.** Un 16 % por debajo del reacondicionado, y luego el estado. Wallapop y Back Market respondieron 403 ese día y eBay pide clave, así que este salto es un prior, no una venta cerrada. Por eso su banda es más ancha.
- **Vender a una tienda.** Un 32 % por debajo del particular.

La confianza es alta con 4 comparables exactos, media con 2 o 3, baja con uno, y «modelo» cuando solo hay curva. La cuenta se hace en el navegador con `src/data/market/observations.json` y `src/data/catalog.json`. No hay API.

Los tests recorren todo el catálogo (más memoria, más disco y mejor estado no bajan el precio; nada negativo ni absurdo) y contrastan los cinco anclajes de arriba con un 12 % de tolerancia.

## De dónde salen los precios

La ficha y el recomendador leen el JSON que viaja con la web. No llaman a un servidor.

| Dato | Archivo | Origen |
| --- | --- | --- |
| Precio nuevo | `src/data/catalog.json` | PVP de lanzamiento en Apple España, con la fuente en cada modelo |
| Reacondicionado | `src/data/market/observations.json` | Escaparate público [apple.com/es/shop/refurbished/mac](https://www.apple.com/es/shop/refurbished/mac) |

Si un modelo es real pero el PVP español no está contrastado, no se inventa la cifra.

Para refrescar el reacondicionado a mano:

```bash
python3 scripts/fetch_observations.py
```

En GitHub eso lo hace `.github/workflows/precios.yml` cada día a las 06:15 UTC. Si el JSON cambia, hace commit y vuelve a publicar la web. Un push con `GITHUB_TOKEN` no dispara el otro workflow, así que el redespliegue va en el mismo flujo.

## Publicar en GitHub Pages

La web es un export estático de Next (`output: 'export'`). No hace falta servidor.

1. Sube este repositorio a GitHub. Para [bbzrwvw65p-bit/hello-web](https://github.com/bbzrwvw65p-bit/hello-web) la dirección queda `https://bbzrwvw65p-bit.github.io/hello-web/`.
2. En el repositorio: **Settings > Pages > Source: GitHub Actions**.
3. El workflow `.github/workflows/pages.yml` construye y despliega en cada push a `main`.

`basePath` y `assetPrefix` salen de `NEXT_PUBLIC_BASE_PATH`. En un sitio de proyecto (`https://<usuario>.github.io/<repo>/`) el workflow lo pone a `/<repo>`. Para **hello-web** ese valor es **`/hello-web`**. Si el repositorio se llama `<usuario>.github.io`, el workflow deja el prefijo vacío porque la web vive en la raíz del dominio.

En local, sin la variable, la web se sirve en la raíz:

```bash
npm install
npm test
npm run dev
```

Abre [http://127.0.0.1:4317](http://127.0.0.1:4317).

Para comprobar el mismo subpath que Pages:

```bash
NEXT_PUBLIC_BASE_PATH=/hello-web npm run build
mkdir -p /tmp/hello-pages/hello-web
cp -a out/. /tmp/hello-pages/hello-web/
python3 -m http.server 4329 --directory /tmp/hello-pages
```

Abre [http://127.0.0.1:4329/hello-web/](http://127.0.0.1:4329/hello-web/).

En el iPhone, Safari → Compartir → Añadir a pantalla de inicio. El manifiesto (`src/app/manifest.ts`), los iconos de `public/icons/` y el service worker usan el mismo `basePath`. El nombre del icono es hello.
