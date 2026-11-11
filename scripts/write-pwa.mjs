import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Lee CUSTOM_DOMAIN de src/config/site.ts: con dominio propio, la base es la raíz.
const site = readFileSync(join(root, "src", "config", "site.ts"), "utf8");
const customDomain = (site.match(/export const CUSTOM_DOMAIN\s*=\s*"([^"]*)"/)?.[1] ?? "").trim();
const base = customDomain ? "" : (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const shell = ["/", "/recomendar/", "/valorar/", "/mi-mac/", "/comparar/", "/catalogo/", "/modelo/", "/checklist/", "/acerca/"].map((path) => `${base}${path}`);

const source = `const CACHE = "hello-shell-v3";
const BASE = ${JSON.stringify(base)};
const SHELL = ${JSON.stringify(shell)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BASE && !url.pathname.startsWith(BASE + "/") && url.pathname !== BASE) return;
  if (url.pathname.includes("hot-update") || url.pathname.includes("/_next/webpack")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.pathname.includes("/_next/static")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(BASE + "/"))),
  );
});
`;

writeFileSync(join(root, "public", "sw.js"), source);
console.log(`sw.js con base «${base || "/"}»`);
if (customDomain) {
  writeFileSync(join(root, "public", "CNAME"), `${customDomain}\n`);
  console.log(`CNAME: ${customDomain}`);
}
