const CACHE_NAME = "ruraldata-cache-v51";

const ARCHIVOS_CACHE = [
  "./",
  "index.html",
  "login.html",
  "registro-usuario.html",
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
  "js/embarque.js",
  "js/txt-snig.js",
  "js/importar-txt.js",
  "js/lotes-embarque.js",

  "pages/registrar-animal.html",
  "pages/buscar-animal.html",
  "pages/sanidad.html",
  "pages/reproduccion.html",
  "pages/resumen.html",
  "pages/listar-animales.html",
  "pages/listar-controles.html",
  "pages/embarque.html",
  "pages/txt-snig.html",
  "pages/importar-txt.html",
  "pages/lotes-embarque.html",

  "assets/img/campo-dashboard.webp",
  "assets/img/fondo-login-ruraldata.webp",
  "assets/img/fondoPantallaSOLEADO.webp",
  "assets/img/fondoPantallasRuralData.webp",
  "assets/img/logo-ruraldata.webp",
  "assets/img/SoloLogo.webp",

  "assets/video/fondo-campo.webm",
  "assets/video/fondo-campo.mp4",
  "assets/video/herefordPastando.webm",
  "assets/video/herefordPastando.mp4",
  "assets/video/transicion-login.webm",
  "assets/video/transicion-login.mp4",
  "assets/video/videoHereford.webm",
  "assets/video/videoHereford.mp4"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        ARCHIVOS_CACHE.map(archivo => {
          return fetch(archivo, { cache: "reload" })
            .then(respuesta => {
              if (respuesta.ok) {
                return cache.put(archivo, respuesta);
              }
            })
            .catch(error => {
              console.log("No se pudo guardar en caché:", archivo, error);
            });
        })
      );
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
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(respuesta => {
          const copiaRespuesta = respuesta.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copiaRespuesta);
            cache.put("index.html", respuesta.clone());
          });

          return respuesta;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(respuestaCache => {
              return respuestaCache || caches.match("index.html");
            });
        })
    );

    return;
  }

  if (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(respuesta => {
          const copiaRespuesta = respuesta.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copiaRespuesta);
          });

          return respuesta;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );

    return;
  }

  event.respondWith(
    caches.match(event.request).then(respuestaCache => {
      return respuestaCache || fetch(event.request).then(respuesta => {
        const copiaRespuesta = respuesta.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copiaRespuesta);
        });

        return respuesta;
      });
    })
  );
});