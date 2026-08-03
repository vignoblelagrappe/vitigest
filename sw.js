// Service worker VitiGest — mise en cache pour un usage hors ligne après un premier chargement en ligne.
// Ne fonctionne que lorsque VitiGest est servi via http(s) (ex. GitHub Pages) — pas en local file://.
const CACHE_NAME = "vitigest-cache-1.5-nf";
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isPage = event.request.mode === "navigate" || event.request.destination === "document";

  if (isPage) {
    // Page principale : toujours essayer le réseau d'abord pour avoir la dernière version.
    // Repli sur le cache seulement si hors ligne (pas de faux 404, pas de version périmée qui colle).
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Tout le reste (React, Recharts, polices, icônes) : cache d'abord, réseau en repli — rarement modifié, priorité à la vitesse.
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
