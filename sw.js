const CACHE_NAME = 'cruisesnitch-cache-v3.2.67'; // Bump this when you update your files
const URLS_TO_CACHE = [
  "/", "/index.html", "/page-files/featured-ports.html", "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/css/portNav.css", "/css/deals.css", "/js/portNav.js", "/js/functions.js", 
  "/last-minute-cruise-deals.html", "/json/community-tips.json", "/json/exchange-rate.json", 
  "/json/emergency-contacts.json", "/json/ports.json", "/images/photos/mediterranean image.jpg", 
  "/images/photos/caribbean image.jpg", "/images/photos/world image.jpg", "/images/photos/close.png", 
  "/images/gifs/deals-header-banner.gif"
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