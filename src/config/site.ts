/**
 * Ajustes del sitio que Joel puede cambiar a mano.
 *
 * PAYPAL_URL: su enlace de PayPal (por ejemplo "https://paypal.me/usuario").
 *   Vacío = no se muestra nada de donaciones en ninguna parte.
 *
 * CUSTOM_DOMAIN: dominio propio sin https ni barra (por ejemplo "hello.thedotapps.com").
 *   Vacío = se publica como ahora, en usuario.github.io/hello-web/.
 *   Con valor = la web se compila para la raíz del dominio (sin /hello-web),
 *   pase lo que pase con NEXT_PUBLIC_BASE_PATH, y se genera public/CNAME.
 *   Ojo: solo cámbialo cuando el DNS ya apunte a GitHub Pages.
 *
 * Este archivo lo leen también next.config.ts y scripts/write-pwa.mjs:
 * deja cada valor en una sola línea, entre comillas dobles.
 */
export const PAYPAL_URL = "";

export const CUSTOM_DOMAIN = "";
