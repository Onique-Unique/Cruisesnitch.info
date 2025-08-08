const CACHE_NAME = 'cruisesnitch-cache-v3.2.16'; // Bump this when you update your files
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
  } else if (event.data === 'CHECK_ALERTS') {
    // Check alerts when requested from the client
    event.waitUntil(checkAllAboardAlerts());
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
      const alerted = data.alertedOffsets || [];
      
      // Check if we need to show an alert
      if (data.userInputs?.alertOffsets?.includes(minsLeft) && !alerted.includes(minsLeft)) {
        // Show notification
        self.registration.showNotification("🚨 CruiseSnitch Alert", {
          body: `${minsLeft} minutes until All Aboard.`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          vibrate: [300, 100, 300],
          tag: "aboard-alert",
          requireInteraction: true
        });
        
        // Save that this offset was already notified
        const updateTx = db.transaction("alerts", "readwrite");
        const updateStore = updateTx.objectStore("alerts");
        updateStore.put({
          ...data,
          alertedOffsets: [...alerted, minsLeft]
        });
      }
      
      // If time has passed, clean up
      if (minsLeft <= 0) {
        const cleanupTx = db.transaction("alerts", "readwrite");
        const cleanupStore = cleanupTx.objectStore("alerts");
        cleanupStore.delete("active");
      }
    };
    
    req.onerror = () => {
      console.error("Error fetching alerts from IndexedDB");
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

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  if (event.notification.tag === 'aboard-alert') {
    event.notification.close();
    
    // Focus or open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});