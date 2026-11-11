export type CheckSection = { title: string; minutes?: string; items: { text: string; how?: string }[] };

export const CHECKLIST: CheckSection[] = [
  {
    title: "Antes de quedar",
    items: [
      { text: "Pide el número de serie y una foto de «Acerca de este Mac».", how: "Menú Apple → Acerca de este Mac. El número de serie también está grabado bajo el equipo." },
      { text: "Comprueba la garantía con el número de serie.", how: "En la web de cobertura de Apple (busca «comprobar cobertura Apple») ves el modelo exacto, si tiene garantía o AppleCare y si coincide con el anuncio." },
      { text: "Pide la factura de compra.", how: "Sin factura no puedes demostrar que no es robado, y al revenderlo te lo pagarán peor." },
    ],
  },
  {
    title: "Bloqueos (lo más importante)",
    items: [
      { text: "Que el vendedor cierre su sesión de iCloud delante de ti.", how: "Ajustes del Sistema → su nombre → Cerrar sesión. Luego «Borrar contenidos y ajustes». Si al reiniciar pide un Apple ID que no es el tuyo, no lo compres: es un ladrillo." },
      { text: "Que no tenga gestión de empresa (MDM).", how: "Ajustes del Sistema → General → Gestión de dispositivos. Si aparece un perfil, o si al configurar sale «Gestión remota», es de una empresa y te lo pueden bloquear." },
      { text: "Bloqueo de firmware sin contraseña.", how: "Al arrancar en modo recuperación no debe pedir una contraseña de firmware." },
    ],
  },
  {
    title: "Batería",
    items: [
      { text: "Mira la salud y los ciclos.", how: "Ajustes del Sistema → Batería → ⓘ junto a «Salud de la batería». Ciclos: Información del sistema (mantén ⌥ y menú Apple) → Alimentación → «Recuento de ciclos»." },
      { text: "Referencia: 80 % o más está bien; menos, cuenta con cambiarla (≈ 150–300 €).", how: "Hasta ~300 ciclos es poco uso; más de 800, la batería está gastada. Apple la da por buena hasta 1.000 ciclos." },
    ],
  },
  {
    title: "Prueba de 5 minutos",
    minutes: "5 min",
    items: [
      { text: "Pantalla: abre una imagen blanca y otra negra a pantalla completa.", how: "Busca píxeles muertos, manchas, bordes amarillentos o el recubrimiento pelado (pasaba en algunos 2015–2017)." },
      { text: "Teclado: escribe todas las teclas en Notas.", how: "Ninguna debe repetirse ni quedarse pegada. Prueba la retroiluminación." },
      { text: "Trackpad: clic en las cuatro esquinas y arrastra.", how: "El clic debe ser igual en toda la superficie." },
      { text: "Puertos: carga por cada puerto y conecta un USB.", how: "Lleva tu cargador y un pendrive o el móvil con cable." },
      { text: "Altavoces, micrófono y cámara.", how: "Pon un vídeo con volumen alto (sin chisporroteos) y abre Photo Booth." },
      { text: "Wi-Fi y Bluetooth.", how: "Comparte datos del móvil y conecta unos auriculares." },
      { text: "Marcas de golpes o líquido.", how: "Esquinas abolladas, tornillos marcados o manchas bajo la pantalla son mala señal." },
    ],
  },
  {
    title: "Al pagar",
    items: [
      { text: "Paga por un método con protección y nunca por adelantado a un desconocido.", how: "En mano, después de probarlo, o con un sistema de pago que retenga el dinero hasta que lo recibas." },
      { text: "Configúralo con tu Apple ID antes de irte.", how: "Si arranca limpio y te deja entrar con tu cuenta, ya es tuyo." },
    ],
  },
];
