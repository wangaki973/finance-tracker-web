const CACHE_NAME = "finance-tracker-shell-v4";
const STATIC_ASSETS = [
  "./",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.svg",
  "apple-touch-icon.png",
];
const APP_ROOT = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(APP_ROOT)),
    );
    return;
  }

  const isVersionedAsset = url.pathname.includes("/assets/");
  const isStaticShellAsset = STATIC_ASSETS.some((asset) => url.href === new URL(asset, APP_ROOT).href);
  if (!isVersionedAsset && !isStaticShellAsset) return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ??
      fetch(request).then((response) => {
        if (!response || !response.ok) return response;
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      }),
    ),
  );
});
