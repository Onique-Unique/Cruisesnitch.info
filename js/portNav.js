//   ********************************************
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");

  sidebar.classList.toggle("open");

  if (sidebar.classList.contains("open")) {
    hamburger.textContent = "✖";

    // Add event listener to close sidebar when clicking outside
    document.addEventListener("click", closeSidebarOnClickAway);
  } else {
    hamburger.innerHTML = `☰ <span>Menu</span>`;
    document.removeEventListener("click", closeSidebarOnClickAway);
  }
}

function closeSidebarOnClickAway(e) {
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");

  // Only apply for small screens
  if (window.innerWidth < 768) {
    const isClickInsideSidebar = sidebar.contains(e.target);
    const isHamburger = hamburger.contains(e.target);

    if (!isClickInsideSidebar && !isHamburger) {
      sidebar.classList.toggle("open");
      hamburger.innerHTML = `☰ <span>Menu</span>`;
      const backButton = document.querySelector(".newSidebarList");
      if (backButton) backButton.click();
      document.getElementById("hamburger").style.display = "block";
      document.removeEventListener("click", closeSidebarOnClickAway);
    }
  }
}


  function autoSearch(city) {
    document.getElementById("cityInput").value = city;
    searchCity();
  }

  // Dynamically load ports grouped by region
  fetch('/json/ports.json')
    .then(response => response.json())
    .then(regions => {
      const container = document.getElementById('popular-ports');
      regions.forEach(group => {
        const regionHeader = document.createElement('h5');
        regionHeader.style.fontSize = "17px";
        regionHeader.style.marginBottom = "5px";
        regionHeader.textContent = group.region;
        container.appendChild(regionHeader);

        group.ports.forEach(port => {
          const btn = document.createElement('button');
          btn.classList = "list-btn"
          btn.textContent = port.name;
          btn.onclick = () => {
            toggleSidebar();
            autoSearch(port.query);
          };
          container.appendChild(btn);
        });
      });
    })
    .catch(error => console.error('Failed to load ports:', error));

// ********************************************************************************
// Searched places are now saved for offline access inside sidebar 
document.getElementById("load-searched-ports").addEventListener("click", showSearchedPorts);

async function showSearchedPorts() {
  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");

  const ports = await new Promise((resolve) => {
    const result = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        result.push(cursor.key);
        cursor.continue();
      } else resolve(result);
    };
  });

  const sidebarDefault = document.getElementById("sidebar-default");
  const sidebarDynamic = document.getElementById("sidebar-dynamic");
  sidebarDefault.style.display = "none";
  sidebarDynamic.style.display = "block";
  sidebarDynamic.innerHTML = `<h4>Searched Ports</h4>`;

  if (!ports.length) {
    sidebarDynamic.innerHTML += `<p>No saved ports yet.</p>`;
    return;
  }

  const backBtn = document.createElement("button");
  backBtn.textContent = "↩ back";
  backBtn.className = "list-btn newSidebarList";
  backBtn.onclick = () => {
    sidebarDynamic.style.display = "none";
    sidebarDefault.style.display = "block";
  };
  sidebarDynamic.appendChild(backBtn);

  ports.forEach((port) => {
    const div = document.createElement("div");
    div.className = "searched-port-row";

    const btn = document.createElement("button");
    btn.textContent = port;
    btn.className = "list-btn";
    btn.onclick = () =>  {
      if (window.innerWidth < 768) {
        toggleSidebar();
        sidebarDynamic.style.display = "none";
        sidebarDefault.style.display = "block";
      }
      showSearchedPlaces(port);
    }
    div.appendChild(btn);

    const del = document.createElement("span");
    del.textContent = "🗑️";
    del.style.cursor = "pointer";
    del.style.marginLeft = "10px";
    del.onclick = async () => {
      if (confirm(`Delete saved data for "${port}"?`)) {
        const db = await openDB();
        const tx = db.transaction("places", "readwrite");
        tx.objectStore("places").delete(port);
        showSearchedPorts(); // refresh list
      }
    };
    div.appendChild(del);

    sidebarDynamic.appendChild(div);
  });
}

async function showSearchedPlaces(portName) {
  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");
  const data = await new Promise((res) => {
    const req = store.get(portName);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

  if (!data || !data.places?.length) {
    alert("No saved data for this port.");
    return;
  }

  // ✅ Set input field to reflect searched port
  document.getElementById("cityInput").value = portName;

  initMap(data.lat, data.lon);
  renderPlaces(data.places, data.lat, data.lon);
}

updateSearchedPortsButton()

async function updateSearchedPortsButton() {
  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");

  const count = await new Promise((resolve) => {
    let total = 0;
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        total++;
        cursor.continue();
      } else resolve(total);
    };
  });

  const btn = document.getElementById("load-searched-ports");
  btn.style.display = count ? "block" : "none";
  // btn.textContent = `📂 Searched Ports (${count})`;
  btn.innerHTML = `📂 Searched Ports (${count})<sup style="font-size: 10px; color: #5b5b5b; margin-left: 4px;">Offline</sup>`;

}

// *********************************************************************************************
let map;
let markers = [];
let allPlacesArray = [];
const googleApiKey = "AIzaSyBtC_bpI8ogcjncnrXJlMfCGzdn2nP6CKU";
const geoapifyKey = "333b769768ff484393d816107be36d23";

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CruisePortPlacesDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      db.createObjectStore("places", { keyPath: "port" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("DB failed to open");
  });
}

async function cleanupExpiredCachedPorts() {
  const db = await openDB(); // Use your openDB function
  const tx = db.transaction("places", "readwrite");
  const store = tx.objectStore("places");

  const now = Date.now();
  const expirationDays = 30;
  const expirationMs = expirationDays * 24 * 60 * 60 * 1000;

  const cursor = await store.openCursor();
  while (cursor) {
    const portData = cursor.value;
    if (portData.savedAt && now - portData.savedAt > expirationMs) {
      await cursor.delete();
    }
    cursor.continue?.();
  }
}

cleanupExpiredCachedPorts();

function normalizePortName(name) {
  return name.trim().toLowerCase();
}

function initMap(lat, lon) {
  if (!map) {
    map = L.map("map").setView([lat, lon], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
  } else {
    map.setView([lat, lon], 13);
  }
  setTimeout(() => map.invalidateSize(), 100);
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

async function searchCity() {
  const cityInput = document.getElementById("cityInput").value.trim();
  if (!cityInput) return alert("Enter a city name");
  const normalizedName = normalizePortName(cityInput);
  document.getElementById("places").innerHTML = "🔍 Searching...";

  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");
  const cached = await new Promise((res) => {
    const req = store.get(normalizedName);
    req.onsuccess = () => res(req.result);
    req.onerror = () => res(null);
  });

  const now = Date.now();
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;

  if (cached && now - cached.timestamp < thirtyDays) {
    initMap(cached.lat, cached.lon);
    renderPlaces(cached.places, cached.lat, cached.lon);
    return;
  }

  try {
    const geoUrl = `https://corsproxy.io/?https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityInput)}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (!geoData.length) {
      document.getElementById("places").innerHTML = "❌ Location not found.";
      return;
    }
    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);
    initMap(lat, lon);
    await loadCombinedPlaces(lat, lon, normalizedName);
  } catch (err) {
    console.error(err);
    document.getElementById("places").innerHTML = "⚠️ Error locating city.";
  }
}

async function loadCombinedPlaces(lat, lon, portName) {
  const radius = 25000;
  const proxy = "https://corsproxy.io/?";
  const googleTypes = [
    "restaurant", "meal_takeaway", "tourist_attraction", "shopping_mall", "night_club",
    "cafe", "library", "lodging", "atm", "park", "casino", "hospital", "pharmacy",
    "supermarket", "bar", "police"
  ];
  const geoapifyCategories = "catering,tourism,leisure,entertainment,shopping,nightlife,fast_food";

  try {
    const googlePromises = googleTypes.map((type) =>
      fetch(
        `${proxy}https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&key=${googleApiKey}`
      ).then((res) => res.json())
    );

    const geoResPromise = fetch(
      `https://api.geoapify.com/v2/places?categories=${geoapifyCategories}&filter=circle:${lon},${lat},${radius}&limit=50&apiKey=${geoapifyKey}`
    ).then((res) => res.json());

    const googleResults = await Promise.all(googlePromises);
    const geoResults = await geoResPromise;

    const placeMap = new Map();

    function normalizeName(name) {
      return name.trim().toLowerCase();
    }

    function addPlace(place) {
      const key = normalizeName(place.name);
      if (!placeMap.has(key)) {
        placeMap.set(key, place);
      } else {
        const existing = placeMap.get(key);
        if (place.distance < existing.distance) {
          placeMap.set(key, place);
        }
      }
    }

    googleResults.forEach((data, i) => {
      data.results?.forEach((place) => {
        const placeLat = place.geometry.location.lat;
        const placeLon = place.geometry.location.lng;
        const distance = getDistance(lat, lon, placeLat, placeLon);
        const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
        const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));
        addPlace({
          name: place.name,
          lat: placeLat,
          lon: placeLon,
          type: googleTypes[i],
          distance,
          walkingTime: walk,
          drivingTime: drive
        });
      });
    });

    geoResults.features?.forEach((place) => {
      const name = place.properties.name;
      if (!name) return;
      const placeLat = place.geometry.coordinates[1];
      const placeLon = place.geometry.coordinates[0];
      const distance = getDistance(lat, lon, placeLat, placeLon);
      const category = place.properties.categories?.[0]?.split(".")[0] || "poi";
      const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
      const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));
      addPlace({
        name,
        lat: placeLat,
        lon: placeLon,
        type: category,
        distance,
        walkingTime: walk,
        drivingTime: drive
      });
    });

    const allPlaces = Array.from(placeMap.values()).sort((a, b) => a.distance - b.distance);
    allPlacesArray = allPlaces;

    // Save to cache
    const db = await openDB();
    const tx = db.transaction("places", "readwrite");
    const store = tx.objectStore("places");
    store.put({
      port: portName,
      timestamp: Date.now(),
      lat,
      lon,
      places: allPlaces
    });

    renderPlaces(allPlaces, lat, lon);
  } catch (err) {
    console.error(err);
    document.getElementById("places").innerHTML = "⚠️ Error loading places.";
  }
}

function renderPlaces(placesArray, lat, lon) {
  if (placesArray.length === 0) {
    document.getElementById("places").innerHTML = "❌ No places found.";
    return;
  }
  let output = `<div id="places">
    <em style="color: #888;"><br><b>💡 Tip:</b> Enter your exact port name for better results eg (ocho rios cruise terminal - Terminal Turística Amber Cove - Port de barcelona - Manila Pier 3 etc. or choose from our already curated list in the menu).</em></div>
    <h3 style="text-align:center; color:#444;">Nearby Attractions & Restaurants</h3>`;
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  for (const place of placesArray) {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${place.lat},${place.lon}&travelmode=walking`;
    output += `<div class="place" data-type="${place.type}">
      <strong>${place.name}</strong>
      <div class="category">${place.type.replace(/_/g, " ")}</div>
      <div class="distance">🚶🏻 ${place.walkingTime} walk 🚗 ${place.drivingTime} drive</div>
      <div class="directions-link">
        <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">
          📍 Get Directions
        </a>
      </div>
    </div>`;

    const marker = L.marker([place.lat, place.lon])
      .addTo(map)
      .bindPopup(`<strong>${place.name}</strong><br>${place.type}<br>🚶🏻 ${place.walkingTime} walk<br>🚗 ${place.drivingTime} drive`);
    markers.push(marker);
  }

  document.getElementById("places").innerHTML = output;
  updateSearchedPortsButton()
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const hr = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hr} hr ${rem} min` : `${hr} hr`;
}

window.onload = function () {
  function loadMap(lat, lon, pins = []) {
    if (!map) {
      map = L.map("map").setView([lat, lon], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
    } else {
      map.setView([lat, lon], 2);
    }
    setTimeout(() => map.invalidateSize(), 100);
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    pins.forEach(pin => {
      const marker = L.marker([pin.lat, pin.lon]).addTo(map).bindPopup(pin.label);
      markers.push(marker);
    });
  }

  const initialPins = [
    { lat: 25.774, lon: -80.19, label: "Miami" },
    { lat: 20.9667, lon: -89.6167, label: "Progreso" },
    { lat: 32.0835, lon: 34.8006, label: "Ashdod" },
    { lat: 35.8896, lon: 14.5146, label: "Valletta" },
    { lat: 22.2864, lon: 114.1491, label: "Hong Kong" },
    { lat: -33.8688, lon: 151.2093, label: "Sydney" },
    { lat: 60.1699, lon: 24.9384, label: "Helsinki" },
    { lat: 62.2426, lon: -6.9844, label: "Tórshavn (Faroe Islands)" },
    { lat: 35.6895, lon: 139.6917, label: "Tokyo (Yokohama)" },
    { lat: 53.3498, lon: -6.2603, label: "Dublin" },
    { lat: 45.4408, lon: 12.3155, label: "Venice" },
    { lat: 37.7749, lon: -122.4194, label: "San Francisco" },
    { lat: 48.4284, lon: -123.3656, label: "Victoria" },
    { lat: 61.2181, lon: -149.9003, label: "Anchorage" },
    { lat: 18.4275, lon: -64.6181, label: "Tortola" },
    { lat: -33.918, lon: 18.4219, label: "Cape Town, South Africa" },
    { lat: -25.967, lon: 32.5832, label: "Maputo, Mozambique" },
    { lat: 30.0444, lon: 31.2357, label: "Alexandria (for Cairo), Egypt" },
    { lat: -22.9068, lon: -43.1729, label: "Rio de Janeiro, Brazil" },
    { lat: -34.6037, lon: -58.3816, label: "Buenos Aires, Argentina" },
    { lat: -12.0464, lon: -77.0428, label: "Callao (Lima), Peru" },
    { lat: -0.2299, lon: -78.5249, label: "Guayaquil, Ecuador" }
  ];

  loadMap(20, 0, initialPins);

  const filterSelect = document.getElementById("place-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      const selectedValues = this.value.split(",");
      const cards = document.querySelectorAll(".place");
      cards.forEach((card) => {
        const type = card.getAttribute("data-type");
        card.style.display = selectedValues.includes("all") || selectedValues.includes(type) ? "block" : "none";
      });
    });
  }
};

// *********************************************************************************************************
  document.getElementById("load-contacts").addEventListener("click", () => {
    loadDynamicSidebar("/json/emergency-contacts.json", "contacts");
  });

  document.getElementById("load-buys").addEventListener("click", () => {
    loadDynamicSidebar("/json/products.json", "buys");
  });

  document.getElementById("load-cmn-tips").addEventListener("click", () => {
    loadDynamicSidebar("/json/community-tips.json", "cmnTips");
  });

  document.getElementById("load-exchange").addEventListener("click", () => {
    loadDynamicSidebar("/json/exchange-rate.json", "rate");
  });

  function loadDynamicSidebar(jsonFile, type) {
    document.getElementById("hamburger").style.display = "none";
    fetch(jsonFile)
      .then((res) => res.json())
      .then((data) => {
        const dynamicDiv = document.getElementById("sidebar-dynamic");
        const defaultDiv = document.getElementById("sidebar-default");
        dynamicDiv.innerHTML = ""; // Clear old content

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "↩ back";
        closeBtn.className = "newSidebarList";
        closeBtn.onclick = () => {
          dynamicDiv.style.display = "none";
          defaultDiv.style.display = "block";
          if (window.innerWidth <= 768) {
            document.getElementById("hamburger").style.display = "block";
          }
        };
        dynamicDiv.appendChild(closeBtn);

        if (type === "buys") {
  const shuffled = data.sort(() => 0.5 - Math.random()); // Shuffle array randomly
  shuffled.forEach((item) => {
    const card = document.createElement("div");
    card.style.marginBottom = "1rem";
    card.innerHTML = `
    <div class="products-loaded">
      <a href="${item.link}" target="_blank" style="color: var(--primary); text-decoration: underline;"><img src="${item.image}" alt="${item.title}" style="width: 100%; border-radius: 8px;" loading="lazy" /></a>
      <strong>${item.title}</strong><br>
      <a href="${item.link}" target="_blank" style="color: var(--primary); text-decoration: underline;">${item.buttonText}</a>
    </div>
      `;
    dynamicDiv.appendChild(card);
  });
}

        if (type === "contacts") {
          for (const line in data) {
            const section = document.createElement("div");
            section.style.marginBottom = "1rem";
            const contacts = data[line].join("<br>");
            section.innerHTML = `<strong>${line}</strong><br>${contacts}`;
            dynamicDiv.appendChild(section);
          }
        }

        if (type === "cmnTips") {
  const tipsContainer = document.createElement("div");
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search cruise tips...";
  searchInput.className = "search-bar";
  searchInput.style = "width: auto; padding: 0.5rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid #ccc;";

  const resultsContainer = document.createElement("div");

  function renderTips(filter = "") {
    resultsContainer.innerHTML = ""; // Clear previous results

    const tipsArray = Array.isArray(data) ? data : Object.values(data).flat();
    const filtered = tipsArray.filter(tip =>
      tip.title.toLowerCase().includes(filter.toLowerCase()) ||
      tip.message.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<p style="opacity: 0.7;">No matching tips found.</p>`;
      return;
    }

    filtered.forEach((tip) => {
      const tipCard = document.createElement("div");
      tipCard.style.marginBottom = "1rem";
      tipCard.innerHTML = `
        <strong>${tip.title}</strong><br>
        <span>${tip.message}</span>
      `;
      resultsContainer.appendChild(tipCard);
    });
  }

  searchInput.addEventListener("input", (e) => {
    renderTips(e.target.value);
  });

  tipsContainer.appendChild(searchInput);
  tipsContainer.appendChild(resultsContainer);
  dynamicDiv.appendChild(tipsContainer);

  renderTips(); // Initial render
}
if (type === "rate") {
  const rateContainer = document.createElement("div");
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search country currency...";
  searchInput.className = "search-bar";
  searchInput.style = "width: auto; padding: 0.5rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid #ccc;";

  const resultsContainer = document.createElement("div");

  // Constants for caching and APIs
  const CACHE_PREFIX = 'exchangeRates_';
  const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const OPEN_EXCHANGE_API_KEY = '06f03fafba104cd0869940edcc3e2d01'; // replace this
  const FRANKFURTER_SUPPORTED = new Set([
    "AUD", "BGN", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
    "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP",
    "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR"
  ]);

  // Helper to round up to 2 decimals (e.g. 0.049 -> 0.05)
  function roundUpTwoDecimals(num) {
    return Math.ceil(num * 100) / 100;
  }

  function getCacheKey(base, symbols) {
    return `${CACHE_PREFIX}${base}->${symbols.sort().join(',')}`;
  }

  // IndexedDB open + cleanup
  function cleanupOldCacheEntries(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rates', 'readwrite');
      const store = tx.objectStore('rates');
      const request = store.openCursor();

      request.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          const entry = cursor.value;
          if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
            store.delete(cursor.primaryKey);
            // console.log(`🧹 Deleted expired cache entry: ${entry.key}`);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ExchangeRatesDB', 1);

      request.onupgradeneeded = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('rates')) {
          db.createObjectStore('rates', { keyPath: 'key' });
        }
      };

      request.onsuccess = async function(e) {
        const db = e.target.result;
        try {
          await cleanupOldCacheEntries(db);
        } catch (err) {
          console.error('Cache cleanup failed', err);
        }
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Async get from IndexedDB cache
  async function getCachedRates(base, symbols) {
    const db = await openDB();
    const tx = db.transaction('rates', 'readonly');
    const store = tx.objectStore('rates');
    const key = getCacheKey(base, symbols);

    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => {
        const cached = req.result;
        const notExpired = cached && (Date.now() - cached.timestamp < CACHE_EXPIRY_MS);
        if (notExpired) {
          // console.log(`📦 Using cached rates from IndexedDB for ${base} → [${symbols.join(', ')}]`);
        }
        resolve(notExpired ? cached.rates : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  // Async save to IndexedDB cache
  async function saveRatesToCache(base, symbols, rates) {
    const db = await openDB();
    const tx = db.transaction('rates', 'readwrite');
    const store = tx.objectStore('rates');
    const key = getCacheKey(base, symbols);
    const entry = { key, base, symbols, rates, timestamp: Date.now() };
    store.put(entry);
    // console.log(`🌐 Fetched from API and cached rates for ${base} → [${symbols.join(', ')}]`);
  }

  // Fetch from Frankfurter API
  async function fetchFrankfurterRates(base, symbols) {
    const to = symbols.join(',');
    const url = `https://api.frankfurter.app/latest?from=${base}&to=${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Frankfurter fetch failed');
    const json = await res.json();
    return json.rates || {};
  }

  // Fetch from Open Exchange Rates API (fallback)
  async function fetchOpenExchangeRates(base, symbols) {
    const url = `https://openexchangerates.org/api/latest.json?app_id=${OPEN_EXCHANGE_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const rates = {};

    for (const sym of symbols) {
      if (base === "USD") {
        rates[sym] = json.rates[sym];
      } else if (sym === "USD") {
        rates[sym] = 1 / json.rates[base];
      } else {
        rates[sym] = json.rates[sym] / json.rates[base];
      }
    }

    return rates;
  }

  // Main function to get rates with fallback & caching
  async function getRates(base, symbols) {
    const cached = await getCachedRates(base, symbols);
    if (cached) return cached;

    try {
      if ([base, ...symbols].every(c => FRANKFURTER_SUPPORTED.has(c))) {
        let rates = await fetchFrankfurterRates(base, symbols);
        for (let cur in rates) {
          rates[cur] = roundUpTwoDecimals(rates[cur]);
        }
        await saveRatesToCache(base, symbols, rates);
        return rates;
      }
    } catch {}

    let rates = await fetchOpenExchangeRates(base, symbols);
    for (let cur in rates) {
      rates[cur] = roundUpTwoDecimals(rates[cur]);
    }
    await saveRatesToCache(base, symbols, rates);
    return rates;
  }

  async function renderRates(filter = "") {
    resultsContainer.innerHTML = "";

    const filtered = data.filter(item =>
      item.title.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<p style="opacity: 0.7;">No matching ports found.</p>`;
      return;
    }

    for (const port of filtered) {
      try {
        const target = port.currency;
        const bases = ["USD", "GBP", "AUD", "CAD"];
        const card = document.createElement("div");
        card.style = "margin-bottom: 1rem; border: 1px solid #ddd; padding: 0.75rem; border-radius: 8px; background: #f8f8f8;";

        let output = `<strong>${port.title}</strong><br><small>${target} rates:</small><br>`;

        for (let base of bases) {
          if (base === target) continue;

          const rates = await getRates(base, [target]);
          const rate = rates[target];

          if (rate !== undefined) {
            output += `1 ${base} = ${rate.toFixed(2)} ${target}<br>`;
          }
        }

        card.innerHTML = output;
        resultsContainer.appendChild(card);
      } catch (err) {
        console.error(`Failed to fetch rates for ${port.title}`, err);
        const errorCard = document.createElement("div");
        errorCard.style = "margin-bottom: 1rem; padding: 0.75rem; border-radius: 8px; background: #fee;";
        errorCard.innerHTML = `<strong>${port.title}</strong><br><i>Error fetching rates</i>`;
        resultsContainer.appendChild(errorCard);
      }
    }
  }

  searchInput.addEventListener("input", (e) => {
    renderRates(e.target.value);
  });

  rateContainer.appendChild(searchInput);
  rateContainer.appendChild(resultsContainer);
  dynamicDiv.appendChild(rateContainer);

  renderRates(); // Initial call
}

        defaultDiv.style.display = "none";
        dynamicDiv.style.display = "block";
      })
      .catch((err) => {
        console.error("Error loading JSON:", err);
      });
  }