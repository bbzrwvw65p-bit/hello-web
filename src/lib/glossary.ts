export type Use = "basico" | "oficina" | "programar" | "foto" | "audio" | "ia" | "juegos" | "entusiasta";

export const USE_LABEL: Record<Use, string> = {
  basico: "Lo básico",
  oficina: "Oficina a tope",
  programar: "Programar",
  foto: "Foto y vídeo",
  audio: "Música y audio",
  ia: "IA en local",
  juegos: "Jugar",
  entusiasta: "Me gusta el hardware",
};

export type TermId =
  | "chip" | "ram" | "ssd" | "pantalla" | "hz120" | "brillo" | "nano" | "puertos" | "externas" | "peso"
  | "bateria" | "soporte" | "semaforo" | "intelligence" | "amortizacion" | "reventa" | "precio" | "intel"
  | "gpu" | "ventilador" | "reacondicionado" | "particular" | "magsafe";

type Term = { title: string; plain: string; forUse?: Partial<Record<Use, string>> };

export const GLOSSARY: Record<TermId, Term> = {
  chip: {
    title: "Chip",
    plain: "Es el motor. M1, M2… cuanto más alto el número, más nuevo. «Pro», «Max» y «Ultra» son versiones con más músculo para trabajos pesados.",
    forUse: {
      basico: "Para navegar, correo y series, cualquier chip de Apple (M1 o posterior) va sobrado.",
      oficina: "Cualquier M1 o posterior. Lo que notarás es la RAM, no el chip.",
      programar: "Un chip base reciente compila bien. Pro solo si compilas proyectos enormes a diario.",
      foto: "Para vídeo 4K a diario, un Pro ahorra tiempo de exportación; para foto, el base cumple.",
      audio: "El base mueve muchas pistas. Pro si usas bibliotecas de orquesta o muchos plugins pesados.",
      ia: "Aquí manda más la memoria que el chip. Max y Ultra mueven los modelos más rápido porque leen la memoria más deprisa.",
      juegos: "La parte gráfica (GPU) es lo que cuenta: Pro o Max para jugar en serio.",
      entusiasta: "Lo último siempre impresiona, pero el salto entre generaciones seguidas es pequeño.",
    },
  },
  ram: {
    title: "Memoria (RAM)",
    plain: "La RAM es como la mesa de trabajo: cuanto más grande, más cosas abiertas a la vez sin que se ralentice. En un Mac con chip de Apple no se puede ampliar después.",
    forUse: {
      basico: "8 GB valen para lo justo; con 16 GB no te preocupas en años.",
      oficina: "Muchas pestañas, Excel pesado y videollamadas a la vez: 16 GB.",
      programar: "Docker, simuladores y el navegador comen mesa: 16 GB mínimo, 24–32 GB si usas contenedores.",
      foto: "16 GB para foto; 24–32 GB para vídeo 4K; 64 GB para 8K.",
      audio: "Las bibliotecas de sonidos se cargan en RAM: 16 GB, y 32 GB o más con orquesta.",
      ia: "Es lo que decide qué modelo cabe: un 7B necesita ~8 GB libres, un 70B unos 48–64 GB.",
      juegos: "16 GB para jugar con soltura.",
    },
  },
  ssd: {
    title: "Almacenamiento (SSD)",
    plain: "Es el armario: donde guardas fotos, apps y documentos. Tampoco se amplía por dentro; un disco externo es la salida barata.",
    forUse: {
      basico: "256 GB bastan si tus fotos están en la nube.",
      programar: "512 GB: Xcode y los contenedores ocupan mucho.",
      foto: "El vídeo llena discos: 1 TB o un SSD externo rápido.",
      ia: "Cada modelo pesa de 4 a 80 GB: 1 TB si vas a probar varios.",
      juegos: "Los juegos actuales ocupan 50–150 GB cada uno.",
    },
  },
  pantalla: { title: "Pantalla", plain: "Tamaño en pulgadas. 13–14″ para llevar encima, 15–16″ si trabajas muchas horas en él." },
  hz120: { title: "120 Hz (ProMotion)", plain: "La imagen se refresca el doble de veces por segundo: el scroll y el ratón se ven más suaves. Agradable, no imprescindible. Solo en MacBook Pro 14″ y 16″." },
  brillo: { title: "Brillo (nits)", plain: "Cuánto ilumina la pantalla. 500 nits está bien en interior; si trabajas junto a una ventana o en terraza, los 1.000 de un MacBook Pro se notan." },
  nano: { title: "Nanotextura", plain: "Un acabado mate que elimina reflejos. Útil con mucha luz; cuesta más y hay que limpiarla con cuidado." },
  puertos: { title: "Puertos", plain: "Dónde enchufas cosas. Si te falta uno, un adaptador de 20–40 € lo resuelve; no pagues cientos de euros solo por un puerto." },
  magsafe: { title: "MagSafe", plain: "Cargador magnético: si alguien tropieza con el cable, se suelta en vez de tirar el portátil al suelo." },
  externas: { title: "Pantallas externas", plain: "Cuántos monitores puedes conectar además de la pantalla del portátil. Los Air M1 y M2 solo admiten uno." },
  peso: { title: "Peso", plain: "Por debajo de 1,3 kg apenas lo notas en la mochila; un 16″ pasa de 2 kg." },
  bateria: { title: "Batería", plain: "Horas de vídeo según Apple. En uso real, cuenta con algo menos. Los chips de Apple duran mucho más que cualquier Intel." },
  soporte: { title: "Soporte de macOS", plain: "Hasta cuándo recibirá versiones nuevas de macOS y parches de seguridad. Sin parches, el banco o algunas apps pueden dejar de funcionar." },
  semaforo: { title: "Semáforo de vida útil", plain: "Verde: le quedan años de soporte. Amarillo: menos de 2 años de parches. Rojo: ya no recibe actualizaciones." },
  intelligence: { title: "Apple Intelligence", plain: "Las funciones de IA de Apple (escribir, resumir, Siri nueva). Solo en Mac con chip de Apple; ningún Intel las tiene." },
  amortizacion: { title: "Amortización", plain: "Lo que te cuesta de verdad cada año: lo que pagas, menos lo que recuperarás al venderlo, repartido entre los años que te va a durar con soporte. Incluye un pequeño coste por las novedades de macOS que ya no le llegarán." },
  reventa: { title: "Reventa", plain: "Lo que podrías pedir por él entre particulares dentro de 2 o 3 años, en muy buen estado." },
  precio: { title: "Precios", plain: "Son orientativos y en rangos: nuevo (precio oficial de salida), reacondicionado (revisado y con garantía) y usado entre particulares (más barato, sin garantía)." },
  intel: { title: "Intel", plain: "Los Mac anteriores a finales de 2020 llevan procesador Intel: más calor, menos batería, sin Apple Intelligence y sin macOS 27." },
  gpu: { title: "Gráfica (GPU)", plain: "La parte del chip que dibuja: importa para vídeo, 3D, juegos e IA de imagen." },
  ventilador: { title: "Sin ventilador", plain: "El MacBook Air no tiene ventilador: silencio total, pero en trabajos largos y pesados baja algo el ritmo para no calentarse." },
  reacondicionado: { title: "Reacondicionado", plain: "Usado, revisado por profesionales, con batería comprobada y garantía. Más caro que a un particular, pero sin sustos." },
  particular: { title: "Usado de particular", plain: "Lo más barato, pero sin garantía: revisa siempre la lista de comprobación antes de pagar." },
};

export function explain(term: TermId, uses: Use[] = []): { title: string; text: string; forYou: string | null } {
  const entry = GLOSSARY[term];
  const forYou = uses.map((use) => entry.forUse?.[use]).find(Boolean) ?? null;
  return { title: entry.title, text: entry.plain, forYou };
}
