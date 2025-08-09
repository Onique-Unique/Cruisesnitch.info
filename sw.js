const CACHE_NAME = 'cruisesnitch-cache-v3.2.33'; // Bump this when you update your files
const URLS_TO_CACHE = [
  "/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/css/portNav.css", "/js/portNav.js",
  "/sounds/alert.wav"
];

// Install: Cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
});

// Activate (clean up old caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  // Take control of all open clients
  self.clients.claim();
});

// Fetch: Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});