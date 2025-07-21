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

// ********************************************
  let map;
  let markers = [];
  let allPlacesArray = [];
  const googleApiKey = "AIzaSyBtC_bpI8ogcjncnrXJlMfCGzdn2nP6CKU";
  const geoapifyKey = "333b769768ff484393d816107be36d23";

  function initMap(lat, lon) {
  if (!map) {
    map = L.map("map").setView([lat, lon], 3); // Global view
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
  } else {
    map.setView([lat, lon], 13);
  }

  // Fix rendering issue
  setTimeout(() => {
    map.invalidateSize();
  }, 100); // allow layout to settle

  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}


  async function searchCity() {
    const cityInput = document.getElementById("cityInput").value.trim();
    if (!cityInput) return alert("Enter a city name");

    const searchTerm = cityInput;
    document.getElementById("places").innerHTML = "🔍 Searching...";

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchTerm
      )}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.length) {
        document.getElementById("places").innerHTML = "❌ Location not found.";
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      initMap(lat, lon);
      loadCombinedPlaces(lat, lon);
    } catch (err) {
      console.error(err);
      document.getElementById("places").innerHTML = "⚠️ Error locating city.";
    }
  }

  async function loadCombinedPlaces(lat, lon) {
    const radius = 25000;
    const proxy = "https://corsproxy.io/?";
    const googleTypes = [
      "restaurant",
      "meal_takeaway",
      "tourist_attraction",
      "shopping_mall",
      "night_club",
      "cafe",
      "library",
      "lodging", 
      "atm",
      "park",
      "casino",
      "hospital",
      "pharmacy",
      "supermarket",
      "bar",
      "police"
    ];
    const geoapifyCategories =
      "catering,tourism,leisure,entertainment,shopping,nightlife,fast_food";

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
          addPlace({
            name: place.name,
            lat: placeLat,
            lon: placeLon,
            type: googleTypes[i],
            distance,
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
        addPlace({
          name: name,
          lat: placeLat,
          lon: placeLon,
          type: category,
          distance,
        });
      });

      allPlacesArray = Array.from(placeMap.values()).sort((a, b) => a.distance - b.distance);

      renderPlaces(allPlacesArray, lat, lon);
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

  let output = `<h3 style="text-align:center; color:#444;">Nearby Attractions & Restaurants</h3>`;

  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  for (const place of placesArray) {
    let walkSpeed = 2;  // more realistic walking speed in km/h
    let driveSpeed = 10;  // realistic average driving speed in km/h

    // First, calculate initial drive time in minutes
    let initialDriveTime = (place.distance / driveSpeed) * 60;

   
    if (initialDriveTime > 20) {
      driveSpeed = 17;     // Increase drive speed for longer drives
      walkSpeed = 2.6;     // Decrease walk speed for realism
    }if (initialDriveTime > 30){
        driveSpeed = 23;
        walkSpeed = 3;
    }if (initialDriveTime > 40){
        driveSpeed = 28;
        walkSpeed = 3.8;
    }

    // Add small random variance (+0 to 5 minutes)
    const walkingMinRaw = (place.distance / walkSpeed) * 60 + Math.random() * 5;

    let drivingMinRaw = (place.distance / driveSpeed) * 60 + Math.random() * 5;
    if (drivingMinRaw < 2) {
    drivingMinRaw = 1;
    }

    const walkingTime = formatDuration(Math.round(walkingMinRaw));
    const drivingTime = formatDuration(Math.round(drivingMinRaw));
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${place.lat},${place.lon}&travelmode=walking`;

    output += `<div class="place" data-type="${place.type}">
      <strong>${place.name}</strong>
      <div class="category">${place.type.replace(/_/g, " ")}</div>
      <div class="distance">
        🚶🏻 ${walkingTime} walk
        🚗 ${drivingTime} drive (Our estimation)
      </div>
      <div class="directions-link">
        <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">
          📍 Get Directions
        </a>
      </div>
    </div>`;

    const marker = L.marker([place.lat, place.lon])
      .addTo(map)
      .bindPopup(
        `<strong>${place.name}</strong><br>${place.type}<br>🚶🏻 ${walkingTime} walk<br>🚗 ${drivingTime} drive (Our estimation)`
      );
    markers.push(marker);
  }

  document.getElementById("places").innerHTML = output;
}

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatDuration(totalMinutes) {
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }

  // FILTERING RESULTS LOGIC & MAP ONLOAD LOGIC FOR SHOWING PINS/ MARKERS
  window.onload = function () {
    function loadMap(lat, lon, pins = []) {
  if (!map) {
    map = L.map("map").setView([lat, lon], 2); // Zoomed out for global view
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
  } else {
    map.setView([lat, lon], 2); // Keep global view
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  // Clear old markers
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  // Add new pins
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
  { lat: -33.9180, lon: 18.4219, label: "Cape Town, South Africa" },
  { lat: -25.9670, lon: 32.5832, label: "Maputo, Mozambique" },
  { lat: 30.0444, lon: 31.2357, label: "Alexandria (for Cairo), Egypt" },
  { lat: -22.9068, lon: -43.1729, label: "Rio de Janeiro, Brazil" },
  { lat: -34.6037, lon: -58.3816, label: "Buenos Aires, Argentina" },
  { lat: -12.0464, lon: -77.0428, label: "Callao (Lima), Peru" },
  { lat: -0.2299, lon: -78.5249, label: "Guayaquil, Ecuador" }
];

  loadMap(20, 0, initialPins); // Centered at 20, 0 and show all pins

    const filterSelect = document.getElementById("place-filter");
if (filterSelect) {
  filterSelect.addEventListener("change", function () {
    const selectedValues = this.value.split(","); // array of types
    const cards = document.querySelectorAll(".place");

    cards.forEach((card) => {
      const type = card.getAttribute("data-type");

      // If "all" selected or card type matches any in selectedValues
      if (
        selectedValues.includes("all") ||
        selectedValues.includes(type)
      ) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });
}
  };

// ********************************************
  document.getElementById("load-contacts").addEventListener("click", () => {
    loadDynamicSidebar("/json/emergency-contacts.json", "contacts");
  });

  document.getElementById("load-buys").addEventListener("click", () => {
    loadDynamicSidebar("/json/products.json", "buys");
  });

  document.getElementById("load-cmn-tips").addEventListener("click", () => {
    loadDynamicSidebar("/json/community-tips.json", "cmnTips");
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

        defaultDiv.style.display = "none";
        dynamicDiv.style.display = "block";
      })
      .catch((err) => {
        console.error("Error loading JSON:", err);
      });
  }