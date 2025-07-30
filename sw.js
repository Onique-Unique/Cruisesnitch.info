const CACHE_NAME = 'cruisesnitch-cache-v3.1.2.02'; // Bump this when you update your files

const URLS_TO_CACHE = [
  "/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/css/portNav.css", "/js/portNav.js"
];

// Install: Cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate (clean up old caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
});

//// Fetch: Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request)
    )
  );
});
// Listen for update signal from app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting(); // 👈 Activate new SW immediately
  }
});