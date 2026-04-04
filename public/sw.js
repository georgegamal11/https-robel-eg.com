const CACHE_NAME = "robel-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles/app.bundle.css",
  "/styles/main.min.css",
  "/styles/skeletons.css",
  "/styles/components/filters.css",
  "/styles/hero.css",
  "/scripts/core/core-bundle.js",
  "/scripts/pages/home.js",
  "/images/ui/logo-main.png",
  "/images/projects/porto-golf-marina/hero/hero-1.webp"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Network-first for API calls
  if (url.hostname.includes("workers.dev") || url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        }
        return r;
      });
    })
  );
});
