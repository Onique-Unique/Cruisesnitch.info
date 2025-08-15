const CACHE_NAME = 'cruisesnitch-cache-v3.3.21'; // Bump this when you update your files
const URLS_TO_CACHE = [
  "/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/images/photos/mediterranean image.jpg", 
  "/images/photos/caribbean image.jpg", "/images/photos/world image.jpg", 
  "/images/photos/close.png", "/images/gifs/deals-header-banner.gif",
  "/json/ports.json", "/page-files/featured-ports.html"
];

// Runtime caches + URL matchers
const RUNTIME_CACHES = {
  tiles: 'cs-tiles-v1',
  images: 'cs-images-v1',
  api: 'cs-api-v1'
};
const OSM = /(^https:\/\/[abc]\.tile\.openstreetmap\.org\/)/;
const GOOGLE_PHOTO = /^https:\/\/maps\.googleapis\.com\/maps\/api\/place\/photo/;
// Some photos redirect to lh*.googleusercontent.com; cache those too:
const GOOGLE_LH3 = /^https:\/\/lh\d+\.googleusercontent\.com\//;
const GEOAPIFY = /^https:\/\/api\.geoapify\.com\//;
const NOMINATIM_PROXY = /^https:\/\/corsproxy\.io\/\?https:\/\/nominatim\.openstreetmap\.org\//;
const RSS2JSON = /^https:\/\/api\.rss2json\.com\//;

async function limitCache(cacheName, max = 300) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  while (keys.length > max) await c.delete(keys.shift());
}

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
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1) Map tiles & place photos → cache-first (opaque responses are fine)
  if (OSM.test(req.url) || GOOGLE_PHOTO.test(req.url) || GOOGLE_LH3.test(req.url)) {
    event.respondWith((async () => {
      const cacheName = OSM.test(req.url) ? RUNTIME_CACHES.tiles : RUNTIME_CACHES.images;
      const cache = await caches.open(cacheName);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;

      // Cross-origin will often be opaque; just cache whatever we get
      const res = await fetch(req).catch(() => null);
      if (res) {
        cache.put(req, res.clone());
        limitCache(cacheName, OSM.test(req.url) ? 400 : 200);
        return res;
      }
      return hit || Response.error();
    })());
    return;
  }

  // 2) JSON APIs → stale-while-revalidate
  if (GEOAPIFY.test(req.url) || NOMINATIM_PROXY.test(req.url) || RSS2JSON.test(req.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHES.api);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        cache.put(req, res.clone());
        limitCache(RUNTIME_CACHES.api, 300);
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
    return;
  }

  // 3) Same-origin (your files) → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // For other cross-origin GETs you don’t care about, do nothing.
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});