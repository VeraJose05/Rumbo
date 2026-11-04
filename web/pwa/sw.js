// RF-12 (PWA): service worker de Rumbo. Lo completa pwa/plugin.ts en cada build.
// - Al instalarse guarda la web entera (es pequeña): abre sin conexión y sin esperar a que el
//   servidor gratuito despierte.
// - La API (planificar, ajustar, charlar) va siempre a la red: no hay itinerarios sin la guía.
// - Los datos (/datos/: coordenadas del mapa) cambian al ampliar la guía: primero la red y, sin
//   conexión, la copia guardada. Si no, el mapa seguía con coordenadas viejas tras actualizar.
// - Una versión nueva de la web crea una caché nueva y borra las antiguas.
const VERSION = '__VERSION__';
const PRECACHE = [/* __PRECACHE__ */];
const API = [/* __API__ */];
const CACHE = `rumbo-${VERSION}`;

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c.startsWith('rumbo-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || API.some((r) => url.pathname.startsWith(r))) return;
  if (url.pathname.startsWith('/datos/')) {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => caches.match(request).then((guardada) => guardada ?? Response.error())),
    );
    return;
  }
  // Las páginas (#/pasaporte, #/viajes…) son todas la misma: index.html, guardado como «/».
  const clave = request.mode === 'navigate' ? '/' : request;
  evento.respondWith(
    caches.match(clave, { ignoreSearch: request.mode === 'navigate' }).then(
      (guardada) =>
        guardada ??
        fetch(request).then((respuesta) => {
          if (respuesta.ok && respuesta.type === 'basic') {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        }),
    ),
  );
});
