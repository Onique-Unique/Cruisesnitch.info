const CACHE_NAME = 'cruisesnitch-cache-v3.2.1'; // Bump this when you update your files

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
});

// Fetch: Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// Immediate activation
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ⏰ BACKGROUND ALERT CHECK
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "aboard-alert-check") {
    event.waitUntil(checkAllAboardAlerts());
  }
});

async function checkAllAboardAlerts() {
  try {
    const db = await openAboardDB();
    const tx = db.transaction("alerts", "readonly");
    const store = tx.objectStore("alerts");
    const req = store.get("active");

    req.onsuccess = () => {
      const data = req.result;
      if (!data) return;

      const now = new Date();
      const target = new Date(data.adjustedAboard);
      const minsLeft = Math.floor((target - now) / 60000);

      if (minsLeft > 0 && minsLeft <= 10) {
        self.registration.showNotification("⚠️ Hurry Back!", {
          body: `${minsLeft} minutes until All Aboard.`,
          icon: "/icons/icon-192.png",
          vibrate: [300, 100, 300],
          tag: "aboard-alert",
          badge: "/icons/icon-192.png"
        });
      }

      if (minsLeft <= 0) {
        // Optional cleanup here if you want auto-remove
      }
    };
  } catch (err) {
    console.error("Error checking aboard alert:", err);
  }
}

// 📁 IndexedDB Access for Service Worker
function openAboardDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AllAboardDB", 1);
    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("alerts")) {
        db.createObjectStore("alerts", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}
