const CACHE_NAME = "ruraldata-cache-v7";

const ARCHIVOS_CACHE = [
  "index.html",
  "login.html",
  "manifest.json",
  "css/styles.css",
  "js/app.js",
  "js/storage.js",
  "js/auth.js",
  "js/identificacion.js",
  "js/animales.js",
  "js/sanidad.js",
  "js/resumen.js",
  "js/listados.js",
  "js/reproduccion.js",
  "pages/registrar-animal.html",
  "pages/buscar-animal.html",
  "pages/sanidad.html",
  "pages/reproduccion.html",
  "pages/resumen.html",
  "pages/listar-animales.html",
  "pages/listar-controles.html"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(claves => {
      return Promise.all(
        claves.map(clave => {
          if (clave !== CACHE_NAME) {
            return caches.delete(clave);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(respuesta => {
      return respuesta || fetch(event.request);
    })
  );
});