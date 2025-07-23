self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("cruisesnitch-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/manifest.webmanifest",
        "/css/portNav.css", // Add your CSS path
        "/js/portNav.js" // Add your JS path
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
