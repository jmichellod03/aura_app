// Service worker de AURA: guarda la app completa para uso sin conexión.
// Al publicar cambios, incremente VERSION para que los dispositivos descarguen la nueva versión.
const VERSION = "aura-v68";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./acero.html",
  "./reticulada.html",
  "./placa.html",
  "./hormigon.html",
  "./muro.html",
  "./madera.html",
  "./mle.html",
  "./espectros.html",
  "./vial.html",
  "./rigido.html",
  "./memo.js",
  "./proyectos.js",
  "./nube.js",
  "./login.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/logo-mmp.webp",
  "./aura.css",
  "./modelo3d.js",
  "./dxf.js",
  "./tablero.js",
];
// KaTeX (ecuaciones de la memoria). Las fuentes .woff2 se guardan al usarse por primera vez.
const KATEX = [
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/dist/umd/supabase.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) =>
    // cache: "reload": baja cada archivo del servidor, no de la caché HTTP del navegador
    c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" }))).then(() =>
      // Si el CDN no responde, la app igual se instala; KaTeX se guardará en el próximo uso con conexión.
      Promise.all(KATEX.map((u) => c.add(new Request(u, { mode: "cors" })).catch(() => {}))))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para recibir actualizaciones) y caché como respaldo sin conexión.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Propios y KaTeX (cdnjs) para que las ecuaciones también se vean sin conexión.
  const url = new URL(req.url);
  if (req.method !== "GET" || (url.origin !== self.location.origin && url.hostname !== "cdnjs.cloudflare.com" && url.hostname !== "cdn.jsdelivr.net")) return;
  // no-cache: revalida con el servidor y evita mezclar una página nueva con un memo.js viejo de la caché HTTP
  e.respondWith(
    fetch(req.mode === "navigate" ? req : new Request(req, { cache: "no-cache" }))
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          e.waitUntil(caches.open(VERSION).then((c) => c.put(req, copia)));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) =>
        r || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
