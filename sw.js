// Service worker VitiGest — mise en cache pour un usage hors ligne après un premier chargement en ligne.
// Ne fonctionne que lorsque VitiGest est servi via http(s) (ex. GitHub Pages) — pas en local file://.
const CACHE_NAME = "vitigest-cache-1.5";
const APP_SHELL = ["./", "./index.html", "./VitiGest-1.5.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first pour tout ce qui a déjà été vu (app + dépendances CDN : React, Recharts, Babel, polices),
// avec repli réseau pour récupérer une ressource jamais vue, et mise en cache au passage.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
