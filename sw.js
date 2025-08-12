const CACHE_NAME = 'cruisesnitch-cache-v3.2.7'; // Bump this when you update your files
const URLS_TO_CACHE = [
  "/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/images/photos/mediterranean image.jpg", 
  "/images/photos/caribbean image.jpg", "/images/photos/world image.jpg", 
  "/images/photos/close.png", "/images/gifs/deals-header-banner.gif"
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

// Fetch: handle only same-origin GET requests (your own files)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Let the browser handle ANY cross-origin request (e.g., Google Photos, OSM tiles)
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // no respondWith => SW does not touch it
  }

  // Cache-first for your own assets
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});