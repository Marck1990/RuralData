const CACHE_NAME = "ruraldata-cache-v1";

const ARCHIVOS_CACHE = [
    "index.html",
    "manifest.json",
    "css/styles.css",
    "js/app.js",
    "js/storage.js",
    "js/identificacion.js",
    "js/animales.js",
    "js/sanidad.js",
    "js/resumen.js",
    "pages/registrar-animal.html",
    "pages/buscar-animal.html",
    "pages/sanidad.html",
    "pages/resumen.html",
    "pages/listar-animales.html",
    "pages/listar-controles.html",
    "js/listados.js",
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ARCHIVOS_CACHE);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(respuesta => {
            return respuesta || fetch(event.request);
        })
    );
});