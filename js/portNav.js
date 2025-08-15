//   ********************************************
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("open");

  if (sidebar.classList.contains("open")) {
    document.getElementById("hamburger-icon").src = "/images/photos/close.png"; // You’ll need a close icon here

    // Add event listener to close sidebar when clicking outside
    document.addEventListener("click", closeSidebarOnClickAway);
  } else {
    document.getElementById("hamburger-icon").src = "/images/favicon_io/android-chrome-512x512.png";
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
      document.getElementById("hamburger-icon").src = "/images/favicon_io/android-chrome-512x512.png";
      const backButton = document.querySelector(".newSidebarList");
      if (backButton) backButton.click();
      document.getElementById("hamburger").style.display = "block";
      document.removeEventListener("click", closeSidebarOnClickAway);
    }
  }
}

// Function to create skeleton loading cards
function createSkeletonCards(containerElement, count = 3) {
  containerElement.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const skeletonCard = document.createElement('div');
    skeletonCard.className = 'skeleton-card';
    
    skeletonCard.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-text title"></div>
      <div class="skeleton-text category"></div>
      <div class="skeleton-text distance"></div>
      <div class="skeleton-text directions"></div>
    `;
    
    containerElement.appendChild(skeletonCard);
  }
}

// Wait until the Places library is loaded
async function ensurePlacesLoaded() {
  while (!(window.google && google.maps && google.maps.places)) {
    await new Promise(r => setTimeout(r, 40));
  }
}

// Create a minimal PlacesService (no map needed)
let _placesService = null;
function getPlacesService() {
  if (_placesService) return _placesService;
  const div = document.createElement('div');
  div.style.display = 'none';
  document.body.appendChild(div);
  _placesService = new google.maps.places.PlacesService(div);
  return _placesService;
}

// Promise wrappers
function nearbySearchAsync(req) {
  const svc = getPlacesService();
  return new Promise((resolve, reject) => {
    svc.nearbySearch(req, (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK || status === 'OK') {
        resolve({ results: results || [], pagination });
      } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve({ results: [], pagination: null });
      } else {
        reject(new Error('nearbySearch failed: ' + status));
      }
    });
  });
}

function getDetailsAsync(req) {
  const svc = getPlacesService();
  return new Promise((resolve, reject) => {
    svc.getDetails(req, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK || status === 'OK') {
        resolve(place);
      } else {
        reject(new Error('getDetails failed: ' + status));
      }
    });
  });
}

// *****************************************************************************************
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
            // Scroll to top of page
            scrollToPlaces();
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
  sidebarDynamic.innerHTML = `<h4>Available When Offline</h4>`;

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
      document.getElementById('filter-sort').style.display = "block";
      if (window.innerWidth < 768) {
        toggleSidebar();
        sidebarDynamic.style.display = "none";
        sidebarDefault.style.display = "block";
      }
       // Hide the featured ports section
      const featuredSection = document.querySelector('.random-ports-section');
      if (featuredSection) {
        featuredSection.style.display = 'none';
      }
      // Scroll to top of page
      scrollToPlaces();
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

  // 🛑 Exit day plan mode if a new search is initiated. This clears
  // any selected places and resets button appearance, ensuring markers
  // return to showing all available places for the new search.
  if (dayPlanMode) {
    dayPlanMode = false;
    dayPlanSelections.clear();
    // Reset create button label and styling if it exists
    const createBtnElem = document.getElementById("create-day-plan-btn");
    if (createBtnElem) {
      createBtnElem.textContent = "➕ Create My Day Plan";
      createBtnElem.style.backgroundColor = "var(--primary)";
      createBtnElem.style.color = "white";
    }
    // Hide finalize button if present
    const finalize = document.getElementById("finalize-day-plan-btn");
    if (finalize) finalize.style.display = "none";
    // Update markers to show all places once day plan mode is off
    updateMapMarkersForDayPlan();
  }

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
// 🗂️ Day Plan persistence
//
// Users can save multiple day plans for each port to IndexedDB for offline access. A
// "Day Plans" button will appear in the sidebar showing how many plans are saved.
// Clicking the button presents a list of ports with saved plans. Selecting a port
// reveals the individual plans, which can be viewed or deleted. Plans are stored
// in the "dayPlans" object store keyed by port name.

async function updateDayPlansButton() {
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readonly");
  const store = tx.objectStore("dayPlans");

  // Count total saved plans across all ports
  const totalPlans = await new Promise((resolve) => {
    let total = 0;
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const record = cursor.value;
        if (record && Array.isArray(record.plans)) {
          total += record.plans.length;
        }
        cursor.continue();
      } else {
        resolve(total);
      }
    };
  });

  // Try to locate or create the button
  let btn = document.getElementById("load-day-plans");
  const portsBtn = document.getElementById("load-searched-ports");
  if (!btn && portsBtn) {
    btn = document.createElement("button");
    btn.id = "load-day-plans";
    btn.className = portsBtn.className;
    btn.addEventListener("click", showDayPlans);
    portsBtn.parentNode.insertBefore(btn, portsBtn.nextSibling);
  }

  if (btn) {
    btn.style.display = totalPlans ? "block" : "none";
    btn.innerHTML = `📅 Day Plans (${totalPlans})<sup style="font-size: 10px; color: #5b5b5b; margin-left: 4px;">Offline</sup>`;
  }
}

async function saveCurrentDayPlan() {
  const portName = document.getElementById("cityInput").value.trim() || "Unknown";
  // Ensure there is a generated plan to save
  if (!lastGeneratedPlanHTML || !lastGeneratedPlanItems || lastGeneratedPlanItems.length === 0) {
    alert("There is no day plan to save.");
    return;
  }
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readwrite");
  const store = tx.objectStore("dayPlans");
  const existing = await new Promise((resolve) => {
    const req = store.get(portName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  let record;
  if (existing) {
    record = existing;
    if (!Array.isArray(record.plans)) record.plans = [];
  } else {
    record = { port: portName, plans: [] };
  }
  const id = Date.now();
  record.plans.push({
    id,
    timestamp: new Date().toISOString(),
    html: lastGeneratedPlanHTML,
    items: lastGeneratedPlanItems.slice(),
    title: lastGeneratedPlanTitle
  });
  store.put(record);
  await tx.done;
  alert("Day plan saved!");
  updateDayPlansButton();
}

async function showDayPlans() {
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readonly");
  const store = tx.objectStore("dayPlans");
  const records = await new Promise((resolve) => {
    const result = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        resolve(result);
      }
    };
  });
  const sidebarDefault = document.getElementById("sidebar-default");
  const sidebarDynamic = document.getElementById("sidebar-dynamic");
  sidebarDefault.style.display = "none";
  sidebarDynamic.style.display = "block";
  sidebarDynamic.innerHTML = `<h4>Saved Day Plans When Offline</h4>`;
  if (!records.length) {
    sidebarDynamic.innerHTML += `<p>No saved day plans yet.</p>`;
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
  records.forEach((record) => {
    const div = document.createElement("div");
    div.className = "searched-port-row";
    const btn = document.createElement("button");
    btn.textContent = `${record.port} (${record.plans.length})`;
    btn.className = "list-btn";
    btn.onclick = () => {
      if (window.innerWidth < 768) {
        toggleSidebar();
        sidebarDynamic.style.display = "none";
        sidebarDefault.style.display = "block";
      }
      showPlansForPort(record.port);
    };
    div.appendChild(btn);
    // Delete all plans for this port
    const del = document.createElement("span");
    del.textContent = "🗑️";
    del.style.cursor = "pointer";
    del.style.marginLeft = "10px";
    del.onclick = async () => {
      if (confirm(`Delete all saved day plans for "${record.port}"?`)) {
        const delDb = await openDB();
        const delTx = delDb.transaction("dayPlans", "readwrite");
        delTx.objectStore("dayPlans").delete(record.port);
        showDayPlans();
        updateDayPlansButton();
      }
    };
    div.appendChild(del);
    sidebarDynamic.appendChild(div);
  });
}

async function showPlansForPort(port) {
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readonly");
  const record = await new Promise((resolve) => {
    const req = tx.objectStore("dayPlans").get(port);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record || !Array.isArray(record.plans) || record.plans.length === 0) {
    alert("No saved plans for this port.");
    return;
  }
  const sidebarDynamic = document.getElementById("sidebar-dynamic");
  sidebarDynamic.innerHTML = `<h4>${port} Day Plans</h4>`;
  const backBtn = document.createElement("button");
  backBtn.textContent = "↩ back";
  backBtn.className = "list-btn newSidebarList";
  backBtn.onclick = () => showDayPlans();
  sidebarDynamic.appendChild(backBtn);
  record.plans.forEach((plan, idx) => {
    const row = document.createElement("div");
    row.className = "searched-port-row";
    const btn = document.createElement("button");
    // Use the saved title if present; otherwise fall back to a generic label
    const label = plan.title && plan.title.trim() ? plan.title : `Plan ${idx + 1}`;
    btn.textContent = label;
    btn.className = "list-btn";
    btn.onclick = () => viewSavedDayPlan(port, plan.id);
    row.appendChild(btn);
    // Add a pencil icon for renaming the plan
    const rename = document.createElement("span");
    rename.textContent = "✏️";
    rename.title = "Rename";
    rename.style.cursor = "pointer";
    rename.style.marginLeft = "8px";
    rename.onclick = async () => {
      const newName = prompt("Enter a new name for this plan:", label);
      if (newName && newName.trim()) {
        // Update the plan title in the stored record and overwrite
        plan.title = newName.trim();
        const db2 = await openDB();
        const tx2 = db2.transaction("dayPlans", "readwrite");
        const store2 = tx2.objectStore("dayPlans");
        // Fetch existing record to ensure we have the most recent plans
        const existing = await new Promise((resolve) => {
          const req = store2.get(port);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        if (existing && Array.isArray(existing.plans)) {
          // find the plan by id and update its title
          for (let i = 0; i < existing.plans.length; i++) {
            if (existing.plans[i].id === plan.id) {
              existing.plans[i].title = plan.title;
              break;
            }
          }
          store2.put(existing);
        }
        await tx2.done;
        showPlansForPort(port);
        updateDayPlansButton();
      }
    };
    row.appendChild(rename);
    // Delete icon
    const del = document.createElement("span");
    del.textContent = "🗑️";
    del.style.cursor = "pointer";
    del.style.marginLeft = "8px";
    del.onclick = async () => {
      if (confirm("Delete this saved day plan?")) {
        await deleteSavedDayPlan(port, plan.id);
        showPlansForPort(port);
        updateDayPlansButton();
      }
    };
    row.appendChild(del);
    sidebarDynamic.appendChild(row);
  });
}

async function viewSavedDayPlan(port, planId) {
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readonly");
  const record = await new Promise((resolve) => {
    const req = tx.objectStore("dayPlans").get(port);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record) return;
  const plan = record.plans?.find((p) => p.id === planId);
  if (!plan) return;
  // Use the existing day plan modal to display the saved plan
  const modal = document.getElementById("day-plan-modal");
  const list = document.getElementById("day-plan-list");
  const titleElem = document.getElementById("day-plan-title");
  list.innerHTML = plan.html;
  titleElem.textContent = plan.title || (`MY ${port.toUpperCase()} SHORE DAY PLAN`);
  // Update globals so the plan can be re-saved or copied
  lastGeneratedPlanItems = plan.items.slice();
  lastGeneratedPlanHTML = plan.html;
  lastGeneratedPlanTitle = plan.title || (`MY ${port.toUpperCase()} SHORE DAY PLAN`);
  // Show the modal
  modal.style.display = "flex";
}

async function deleteSavedDayPlan(port, planId) {
  const db = await openDB();
  const tx = db.transaction("dayPlans", "readwrite");
  const store = tx.objectStore("dayPlans");
  const record = await new Promise((resolve) => {
    const req = store.get(port);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record) return;
  record.plans = record.plans.filter((p) => p.id !== planId);
  if (record.plans.length === 0) {
    store.delete(port);
  } else {
    store.put(record);
  }
  await tx.done;
}

// *********************************************************************************************

function handleTileSelection(e) {
  const card = e.currentTarget;
  if (dayPlanSelections.has(card)) {
    dayPlanSelections.delete(card);
    card.classList.remove("day-plan-selected");
  } else {
    dayPlanSelections.add(card);
    card.classList.add("day-plan-selected");
  }

  // Update markers on the map when selections change in day plan mode
  updateMapMarkersForDayPlan();
}
let dayPlanMode = false;
let dayPlanSelections = new Set();

/**
 * Update the Leaflet map markers depending on whether day plan mode is active.
 * In day plan mode, only markers for the currently selected places are shown.
 * Otherwise, markers for all loaded places are shown.
 */
function updateMapMarkersForDayPlan() {
  if (!map) return;
  // Remove all markers from the map so we can show only the ones that should be visible
  allPlaceMarkers.forEach(obj => map.removeLayer(obj.marker));
  markers = [];

  // When not in day plan mode, show all pre-created markers
  if (!dayPlanMode) {
    allPlaceMarkers.forEach(obj => {
      obj.marker.addTo(map);
    });
    markers = allPlaceMarkers.map(obj => obj.marker);
    return;
  }

  // If in day plan mode, add only markers corresponding to selected cards
  dayPlanSelections.forEach(card => {
    if (!(card instanceof Element)) return;
    const lat = parseFloat(card.getAttribute('data-lat'));
    const lon = parseFloat(card.getAttribute('data-lon'));
    if (isNaN(lat) || isNaN(lon)) return;
    // Find the matching pre-created marker in allPlaceMarkers
    for (const obj of allPlaceMarkers) {
      if (Math.abs(obj.lat - lat) < 0.000001 && Math.abs(obj.lon - lon) < 0.000001) {
        obj.marker.addTo(map);
        markers.push(obj.marker);
        break;
      }
    }
  });
}

// Keep track of the coordinates of the currently searched port. These values
// are populated in renderPlaces() and later used by showDayPlanModal() to
// calculate distances from the port to the first destination and back again.
let currentPortLat = null;
let currentPortLon = null;

// When a day plan is generated in the modal, we snapshot its content here so
// that it can be saved for later offline access. `lastGeneratedPlanItems`
// holds the array of itinerary strings, `lastGeneratedPlanHTML` is the
// HTML markup for the plan list, and `lastGeneratedPlanTitle` is the
// heading shown at the top of the modal.
let lastGeneratedPlanItems = [];
let lastGeneratedPlanHTML = "";
let lastGeneratedPlanTitle = "";

const createBtn = document.getElementById("create-day-plan-btn");

createBtn.addEventListener("click", function () {
  dayPlanMode = !dayPlanMode;
  document.getElementById("finalize-day-plan-btn").style.display = dayPlanMode ? "block" : "none";

  const placeCards = document.querySelectorAll(".place:not(.ad-tile)");
  dayPlanSelections.clear();

  placeCards.forEach(card => {
    card.classList.remove("day-plan-selected");
    card.classList.remove("day-plan-selectable");

    if (dayPlanMode) {
      card.classList.add("day-plan-selectable");
      card.addEventListener("click", handleTileSelection);
    } else {
      card.removeEventListener("click", handleTileSelection);
    }
  });

  // Hide share icons during Day Plan mode
  document.querySelectorAll(".share-place-btn").forEach(b => {
    b.style.display = dayPlanMode ? "none" : "flex";
  });

  // 🔴 Change button appearance and label
  if (dayPlanMode) {
    this.textContent = "❌ Exit Day Plan Mode";
    this.style.backgroundColor = "#dc9735b5"; // Bootstrap red
    this.style.color = "white";
  } else {
    this.textContent = "➕ Create My Day Plan";
    this.style.backgroundColor = "var(--primary)";
    this.style.color = "white";
  }

  // Update map markers to reflect whether day plan mode is active and selections
  updateMapMarkersForDayPlan();
});

function selectPlaceForDayPlan(event) {
  if (!dayPlanMode) return;

  const tile = event.currentTarget;
  const placeName = tile.querySelector("strong")?.textContent || "";
  const placeId = tile.getAttribute("data-placeid") || placeName;

  if (dayPlanSelections.has(placeId)) {
    dayPlanSelections.delete(placeId);
    tile.classList.remove("selected-day-plan");
  } else {
    dayPlanSelections.add(placeId);
    tile.classList.add("selected-day-plan");
  }

  event.stopPropagation(); // prevent any other handlers
}

// Original version of showDayPlanModal retained for reference but not used.
function showDayPlanModalOld1_unused() {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.id = "day-plan-modal-overlay";
  overlay.style = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
    z-index: 9999; overflow-y: auto;
  `;

  // Create modal container
  const modal = document.createElement("div");
  modal.style = `
    background: white; padding: 20px; border-radius: 8px; max-width: 600px; width: 90%;
    max-height: 80vh; overflow-y: auto; box-shadow: 0 0 15px rgba(0,0,0,0.3);
  `;

  // Title with port name (assumes last search input is port name)
  const portName = document.getElementById("cityInput")?.value.trim() || "Your Port";
  const title = document.createElement("h2");
  title.textContent = `My ${portName.toUpperCase()} Shore Day Plan`;
  title.style.marginBottom = "15px";

  // List container
  const list = document.createElement("div");
  list.style.maxHeight = "50vh";
  list.style.overflowY = "auto";
  list.style.marginBottom = "15px";

  // Build list of selected places with remove button
  dayPlanSelections.forEach(id => {
    // Find the place tile by placeId or fallback name
    const placeTile = Array.from(document.querySelectorAll(".place")).find(
      el => el.getAttribute("data-placeid") === id || el.querySelector("strong")?.textContent === id
    );
    if (!placeTile) return;

    const name = placeTile.querySelector("strong")?.textContent || "Unknown place";
    const walkingTime = placeTile.querySelector(".distance")?.textContent.match(/🚶🏻 ([^ ]+)/)?.[1] || "";
    const drivingTime = placeTile.querySelector(".distance")?.textContent.match(/🚗 ([^( ]+)/)?.[1] || "";
    const directionsLink = placeTile.querySelector(".directions-link a")?.href || "#";

    const item = document.createElement("div");
    item.style = "border-bottom: 1px solid #ddd; padding: 8px 0; display: flex; justify-content: space-between; align-items: center;";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${name}</strong><br>
                      <small>(🚶🏻 ${walkingTime} walk, 🚗 ${drivingTime} drive estimate)</small><br>
                      <a href="${directionsLink}" target="_blank" style="color:#007bff; text-decoration:underline;">Get Directions</a>`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.style = "margin-left:10px; padding: 5px 10px; cursor: pointer; background:#dc3545; color:#fff; border:none; border-radius:4px;";
    removeBtn.addEventListener("click", () => {
      dayPlanSelections.delete(id);
      list.removeChild(item);
    });

    item.appendChild(info);
    item.appendChild(removeBtn);
    list.appendChild(item);
  });

  // Action buttons container
  const actions = document.createElement("div");
  actions.style.textAlign = "right";

  // Copy to clipboard button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy to Clipboard";
  copyBtn.style = "margin-right: 10px; padding: 8px 14px; cursor: pointer; background:#28a745; color:#fff; border:none; border-radius:4px;";
  copyBtn.addEventListener("click", () => {
    const textLines = [];
    textLines.push(`My ${portName} Shore Day Plan:\n`);
    dayPlanSelections.forEach(id => {
      const placeTile = Array.from(document.querySelectorAll(".place")).find(
        el => el.getAttribute("data-placeid") === id || el.querySelector("strong")?.textContent === id
      );
      if (!placeTile) return;
      const name = placeTile.querySelector("strong")?.textContent || "Unknown place";
      const walkingTime = placeTile.querySelector(".distance")?.textContent.match(/🚶🏻 ([^ ]+)/)?.[1] || "";
      const drivingTime = placeTile.querySelector(".distance")?.textContent.match(/🚗 ([^( ]+)/)?.[1] || "";
      const directionsLink = placeTile.querySelector(".directions-link a")?.href || "#";
      textLines.push(`- ${name} (🚶🏻 ${walkingTime} walk, 🚗 ${drivingTime} drive estimate) \n  Directions: ${directionsLink}`);
    });
    navigator.clipboard.writeText(textLines.join("\n")).then(() => {
      alert("Day Plan copied to clipboard!");
    });
  });

  // Share button (simple navigator.share if supported)
  const shareBtn = document.createElement("button");
  shareBtn.textContent = "Share";
  shareBtn.style = "padding: 8px 14px; cursor: pointer; background:#007bff; color:#fff; border:none; border-radius:4px;";
  shareBtn.addEventListener("click", () => {
    if (navigator.share) {
      const shareText = `My ${portName} Shore Day Plan\n` + Array.from(dayPlanSelections).map(id => {
        const placeTile = Array.from(document.querySelectorAll(".place")).find(
          el => el.getAttribute("data-placeid") === id || el.querySelector("strong")?.textContent === id
        );
        if (!placeTile) return "";
        return placeTile.querySelector("strong")?.textContent || "";
      }).join(", ");
      navigator.share({
        title: `My ${portName} Shore Day Plan`,
        text: shareText,
      }).catch(console.error);
    } else {
      alert("Sharing not supported on this browser.");
    }
  });

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style = "margin-left: 10px; padding: 8px 14px; cursor: pointer; background:#6c757d; color:#fff; border:none; border-radius:4px;";
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  actions.appendChild(copyBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(closeBtn);

  modal.appendChild(title);
  modal.appendChild(list);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Old version of showDayPlanModal that accepted places; no longer used.
function showDayPlanModalPlaces_unused(places) {
  const list = document.getElementById("day-plan-list");
  const title = document.getElementById("day-plan-title");

  title.textContent = `My ${capitalizePortName(currentPortForPlan)} Shore Day Plan`;
  list.innerHTML = "";

  places.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${p.name}</strong><br>
      🚶🏻 ${p.walking}<br>
      🚗 ${p.driving}<br>
      <a href="${p.directions}" target="_blank">📍 Directions</a>
    `;
    list.appendChild(li);
  });

  document.getElementById("day-plan-modal").style.display = "flex";

  document.getElementById("copy-day-plan").onclick = () => {
    const text = `${title.textContent}\n\n` + places.map(p => 
      `${p.name}\n🚶🏻 ${p.walking}\n🚗 ${p.driving}\n📍 ${p.directions}\n`
    ).join("\n");
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
  };

  document.getElementById("share-day-plan").onclick = () => {
    const text = `${title.textContent}\n\n` + places.map(p => 
      `${p.name}\n🚶🏻 ${p.walking}\n🚗 ${p.driving}\n📍 ${p.directions}\n`
    ).join("\n");
    if (navigator.share) {
      navigator.share({ title: title.textContent, text });
    } else {
      alert("Your browser doesn’t support native sharing. You can paste this text manually.");
    }
  };
}

function capitalizePortName(name) {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}


// *********************************************************************************************
let map;
let markers = [];
// Holds all marker objects and associated place info so markers can be
// efficiently shown or hidden without recreating them when toggling
// day plan mode. Each entry is { marker, lat, lon, name, type, walkingTime, drivingTime }.
let allPlaceMarkers = [];
let allPlacesArray = [];
let currentPortKey = null; // normalized port name of the current results
const googleApiKey = "AIzaSyBtC_bpI8ogcjncnrXJlMfCGzdn2nP6CKU";
const geoapifyKey = "333b769768ff484393d816107be36d23";

// Advert Places Tile
function createAdTile() {
  return `
    <div class="place ad-tile" data-type="ad">
      <strong>💼 Unlock Premium Cruise Tools</strong>
      <div class="category">Exclusive Features</div>
      <div class="distance">🚀 Enhanced planning & savings tools</div>
      <button class="shop-now-btn" style="margin-top:5px; background:#28a745; color:white; border:none; padding:8px 12px; border-radius:5px;">
        🛍️ View Products
      </button>
    </div>
  `;
}

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    // Bump the version number to ensure new object stores can be created. Version 2
    // contains a new "dayPlans" object store used to persist saved day plans by
    // port name. We check for the existence of each store before creating it
    // because onupgradeneeded may be triggered multiple times.
    const request = indexedDB.open("CruisePortPlacesDB", 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Create the places store if it doesn't exist
      if (!db.objectStoreNames.contains("places")) {
        db.createObjectStore("places", { keyPath: "port" });
      }
      // Create the dayPlans store to save multiple plans per port
      if (!db.objectStoreNames.contains("dayPlans")) {
        db.createObjectStore("dayPlans", { keyPath: "port" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("DB failed to open");
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // data:image/...;base64,...
    reader.readAsDataURL(blob);
  });
}

// Save base64 photo for a place into the current port's cached list
async function cachePhotoForPlace(portKey, placeCard, dataUrl) {
  if (!portKey || !dataUrl) return;

  const name = (placeCard.querySelector("strong")?.textContent || "").trim();
  const lat  = parseFloat(placeCard.getAttribute("data-lat") || "0");
  const lon  = parseFloat(placeCard.getAttribute("data-lon") || "0");

  const db = await openDB();
  const tx = db.transaction("places", "readwrite");
  const store = tx.objectStore("places");

  const record = await new Promise((res) => {
    const req = store.get(portKey);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });
  if (!record || !Array.isArray(record.places)) return;

  // Try to match by placeId, else by name+lat+lon
  const placeId = placeCard.getAttribute("data-placeid") || "";
  const idx = record.places.findIndex(p =>
    (placeId && p.placeId === placeId) ||
    (!placeId && p.name === name &&
      Math.abs((p.lat||0) - lat) < 1e-6 &&
      Math.abs((p.lon||0) - lon) < 1e-6)
  );
  if (idx === -1) return;

  record.places[idx].photoData = dataUrl; // 👈 store for reuse
  store.put(record);
  await tx.done;
}

// Save one or more reviews onto the matched place inside the current port record
async function cacheReviewsForPlace(portKey, placeCard, reviewsArray) {
  if (!portKey || !Array.isArray(reviewsArray) || reviewsArray.length === 0) return;

  const name = (placeCard.querySelector("strong")?.textContent || "").trim();
  const lat  = parseFloat(placeCard.getAttribute("data-lat") || "0");
  const lon  = parseFloat(placeCard.getAttribute("data-lon") || "0");

  const db = await openDB();
  const tx = db.transaction("places", "readwrite");
  const store = tx.objectStore("places");

  const record = await new Promise((res) => {
    const req = store.get(portKey);
    req.onsuccess = () => res(req.result || null);
    req.onerror   = () => res(null);
  });
  if (!record || !Array.isArray(record.places)) return;

  const placeId = placeCard.getAttribute("data-placeid") || "";
  const idx = record.places.findIndex(p =>
    (placeId && p.placeId === placeId) ||
    (!placeId && p.name === name && Math.abs((p.lat||0)-lat)<1e-6 && Math.abs((p.lon||0)-lon)<1e-6)
  );
  if (idx === -1) return;

  // keep it small; store a few recent/highlight reviews
  record.places[idx].reviews = reviewsArray.slice(0, 3);
  store.put(record);
  await tx.done;
}

async function getCachedReviewForPlace(portKey, placeCard) {
  if (!portKey) return null;
  const name = (placeCard.querySelector("strong")?.textContent || "").trim();
  const lat  = parseFloat(placeCard.getAttribute("data-lat") || "0");
  const lon  = parseFloat(placeCard.getAttribute("data-lon") || "0");
  const placeId = placeCard.getAttribute("data-placeid") || "";

  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");
  const record = await new Promise((res) => {
    const req = store.get(portKey);
    req.onsuccess = () => res(req.result || null);
    req.onerror   = () => res(null);
  });
  if (!record || !Array.isArray(record.places)) return null;

  const item = record.places.find(p =>
    (placeId && p.placeId === placeId) ||
    (!placeId && p.name === name && Math.abs((p.lat||0)-lat)<1e-6 && Math.abs((p.lon||0)-lon)<1e-6)
  );
  return item?.reviews?.[0] || null;
}

async function cleanupExpiredCachedPorts() {
  const db = await openDB(); // your existing openDB() helper
  const tx = db.transaction('places', 'readwrite');
  const store = tx.objectStore('places');
  const now = Date.now();
  const expirationMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        const portData = cursor.value;
        if (portData && portData.timestamp && (now - portData.timestamp > expirationMs)) {
          cursor.delete(); // deletes the current record
        }
        cursor.continue(); // move to the next record
      } else {
        resolve(); // no more entries
      }
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
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

// Helper: check if a port has already been searched and cached in IndexedDB
async function isPortCached(portName) {
  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");
  return new Promise((resolve) => {
    const req = store.get(portName);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}

// --- Human Verification Lock (persists across reloads) ---
const HV_LOCK_KEY = 'hv_lock_v1';
const HV_LOCK_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

function getHvLock() {
  try { return JSON.parse(localStorage.getItem(HV_LOCK_KEY) || 'null'); }
  catch { return null; }
}
function setHvLockPending(portKey) {
  const lock = {
    required: true,
    portKey: portKey || '',
    nonce: (crypto?.getRandomValues?.(new Uint32Array(1))[0] || Date.now()),
    createdAt: Date.now()
  };
  localStorage.setItem(HV_LOCK_KEY, JSON.stringify(lock));
}
function clearHvLock() {
  localStorage.removeItem(HV_LOCK_KEY);
}
function isHvLocked() {
  const lock = getHvLock();
  if (!lock || lock.required !== true) return false;
  // expire stale locks (user abandoned modal)
  if (Date.now() - (lock.createdAt || 0) > HV_LOCK_MAX_AGE_MS) {
    clearHvLock();
    return false;
  }
  return true;
}

// Count only NEW unique searches (not yet cached in IDB) and prompt on every 6th.
async function isHumanVerificationNeeded(portName) {
  const normalized = normalizePortName(portName);
  const cached = await isPortCached(normalized); // already in your code
  if (cached) return false;                      // ✅ Only new, not-yet-saved searches count

  // Track new unique search count in localStorage
  const k = 'hv_newSearchCount';
  let count = parseInt(localStorage.getItem(k) || '0', 10);
  count += 1;
  localStorage.setItem(k, String(count));

  // Prompt on every 3rd new search
  return (count % 3 === 0);
}

function showHumanVerification(onSuccess) {
  // Overlay
  const overlay = document.createElement('div');
  overlay.style = `
    position: fixed; inset: 0; z-index: 9999;
    display: grid; place-items: center;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(6px);
  `;

  // Card
  const card = document.createElement('div');
  card.style = `
    width: min(92vw, 420px);
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 16px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.18);
    color: #0f172a;
    font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    overflow: hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.style = `
    display:flex; align-items:center; gap:10px;
    padding:16px 18px;
    background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
    color:white;
  `;
  header.innerHTML = `
    <div style="font-size:22px;line-height:1">🛳️</div>
    <div>
      <div style="font-weight:700;letter-spacing:.2px">Quick human check</div>
      <div style="opacity:.9;font-size:13px">This won’t take more than a second</div>
    </div>
  `;

  // Body (acts as "modal" container like in your snippets)
  const body = document.createElement('div');
  body.style = `padding:16px 18px;`;
  const modal = body;

  // Success handler: auto-close + clear lock + proceed
  function solved() {
    // optional micro feedback
    let ok = body.querySelector('.hv-ok');
    if (!ok) {
      ok = document.createElement('div');
      ok.className = 'hv-ok';
      ok.style = 'margin-top:10px;font-size:13px;color:#16a34a;font-weight:600;';
      ok.textContent = 'Verified!';
      body.appendChild(ok);
    }
    setTimeout(() => {
      try { typeof clearHvLock === 'function' && clearHvLock(); } catch {}
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try { typeof onSuccess === 'function' && onSuccess(); } catch {}
    }, 250);
  }

  // Back-compat alias so your existing code can call complete()
  const complete = solved;

  // Helper message (no alerts)
  function setMsg(text, ok=false) {
    let msg = body.querySelector('.hv-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'hv-msg';
      msg.style = 'margin-top:8px;font-size:12px;color:#64748b';
      body.appendChild(msg);
    }
    msg.textContent = text || '';
    msg.style.color = ok ? '#16a34a' : '#64748b';
  }

  // ------- CHALLENGES (0..5): your 4 + 2 new -------
  const type = Math.floor(Math.random() * 6);

  if (type === 0) {
    // Math
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">What is ${a} + ${b}?</p>`);
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = 'Answer';
    input.style = 'margin:0 0.5rem 1rem 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;outline:none;';
    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.style = 'padding:8px 12px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;';
    submit.onclick = () => {
      if (parseInt(input.value, 10) === a + b) { setMsg('Great!', true); complete(); }
      else { setMsg('Incorrect, try again.'); }
    };
    modal.appendChild(input); modal.appendChild(submit);
    input.focus();

  } else if (type === 1) {
    // Type word backwards
    const words = ['ocean','ship','port','cabin','anchor','island'];
    const word = words[Math.floor(Math.random() * words.length)];
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">Type the word <strong>${word}</strong> backwards:</p>`);
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Your answer';
    input.style = 'margin:0 0.5rem 1rem 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;outline:none;';
    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.style = 'padding:8px 12px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;';
    submit.onclick = () => {
      if (input.value.toLowerCase() === word.split('').reverse().join('')) { setMsg('Nice!', true); complete(); }
      else { setMsg('Incorrect, try again.'); }
    };
    modal.appendChild(input); modal.appendChild(submit);
    input.focus();

  } else if (type === 2) {
    // Click the correct color
    const colors = ['red','blue','green','yellow'];
    const target = colors[Math.floor(Math.random() * colors.length)];
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">Click on the <strong>${target}</strong> circle to continue.</p>`);
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;';
    colors.sort(() => Math.random() - 0.5).forEach(color => {
      const circle = document.createElement('div');
      circle.style = `width:40px;height:40px;border-radius:50%;background:${color};cursor:pointer;border:2px solid #e2e8f0;`;
      circle.onclick = () => {
        if (color === target) { setMsg('All set!', true); complete(); }
        else { setMsg('Wrong one, try again.'); }
      };
      row.appendChild(circle);
    });
    modal.appendChild(row);

  } else if (type === 3) {
    // Order the numbers
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">Click the numbers in ascending order:</p>`);
    const numbers = [1,2,3,4].sort(() => Math.random() - 0.5);
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;';
    let nextExpected = 1;
    numbers.forEach(n => {
      const button = document.createElement('button');
      button.textContent = n;
      button.style = 'width:40px;height:40px;font-size:1.1rem;border-radius:10px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;';
      button.onclick = () => {
        if (n === nextExpected) {
          button.disabled = true; button.style.opacity = '0.5';
          nextExpected++;
          if (nextExpected > 4) { setMsg('Perfect!', true); complete(); }
        } else { setMsg('Out of order, try again.'); }
      };
      row.appendChild(button);
    });
    modal.appendChild(row);

  } else if (type === 4) {
    // Slide to verify
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">Slide to confirm you’re human</p>`);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = '0';
    slider.style = 'width:100%;accent-color:#2563eb;';
    slider.addEventListener('input', () => {
      if (parseInt(slider.value, 10) >= 100) { setMsg('Done!', true); complete(); }
    });
    modal.appendChild(slider);

  } else {
    // Tap the anchor among emojis
    const items = ['🦀','🏝️','⚓','🧭','🪼','🌊'];
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    modal.insertAdjacentHTML('beforeend', `<p style="margin:0 0 8px 0;font-weight:600;">Tap the <span title="anchor">⚓</span> to continue</p>`);
    const grid = document.createElement('div');
    grid.style = 'display:grid;grid-template-columns:repeat(6,1fr);gap:8px;';
    shuffled.forEach(e => {
      const btn = document.createElement('button');
      btn.style = 'font-size:24px;line-height:1;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;';
      btn.textContent = e;
      btn.onclick = () => {
        if (e === '⚓') { setMsg('Nice!', true); complete(); }
        else { setMsg('Try a different one.'); }
      };
      grid.appendChild(btn);
    });
    modal.appendChild(grid);
  }

  card.append(header, body);
  overlay.append(card);
  document.body.appendChild(overlay);
}

function syncUrlWithSearchBox(){
  const term = normalizeSpaces(document.getElementById("cityInput")?.value || "");
  const url = buildShareUrl(term);
  if (history && history.replaceState) history.replaceState({}, "", url);
}

function mapGeoapifyToGoogleType(props) {
  const cats = Array.isArray(props?.categories) ? props.categories : [];
  const has = (...ns) => cats.some(c => ns.some(n => c === n || c.startsWith(n + ".")));

  // Food & drink
  if (has("catering.fast_food")) return "meal_takeaway"; // 👈 add this

  // Nightlife
  if (has("adult.nightclub")) return "night_club"; // 👈 add this

  // Attractions / leisure / parks
  if (has("tourism","entertainment","leisure")) return "tourist_attraction";

  // Shopping
  if (has("commercial.supermarket")) return "shopping_mall";

  // Services / emergencies / etc.
  if (has("healthcare.hospital")) return "hospital";
  if (has("healthcare.pharmacy")) return "pharmacy";
  if (has("service.police")) return "police";
  if (has("service.financial.atm","service.financial.bank","service.financial.money_transfer",)) return "atm"; // 👈 broaden ATM match

  // Lodging / library
  if (has("accommodation.hotel")) return "lodging";
  if (has("education.library")) return "library";

  return "poi"; // fallback
}

async function searchCity() {
  // Block if a verification is pending (e.g., user canceled or reloaded)
  if (isHvLocked()) {
    showHumanVerification(() => { clearHvLock(); searchCity(); });
    return;
  }
  syncUrlWithSearchBox();
  // Hide the featured ports section
  const featuredSection = document.querySelector('.random-ports-section');
  if (featuredSection) {
    featuredSection.style.display = 'none';
  }
  // Displays Filter Category On search
  document.getElementById('filter-sort').style.display = "block";
  // Get the current port name from the input box and ensure it's a string
  const portName = document.getElementById('cityInput').value.trim();
  if (!portName) {
    alert("Enter a city name");
    return;
  }

  // Human Verification Cont
  if (await isHumanVerificationNeeded(portName)) {
  setHvLockPending(normalizePortName(portName));
  showHumanVerification(() => { clearHvLock(); searchCity(); });
  return;
}

  // 🛑 Exit day plan mode if a new search is initiated. This clears
  // any selected places and resets button appearance, ensuring markers
  // return to showing all available places for the new search.
  if (dayPlanMode) {
    dayPlanMode = false;
    dayPlanSelections.clear();
    // Reset create button label and styling if it exists
    const createBtnElem = document.getElementById("create-day-plan-btn");
    if (createBtnElem) {
      createBtnElem.textContent = "➕ Create My Day Plan";
      createBtnElem.style.backgroundColor = "var(--primary)";
      createBtnElem.style.color = "white";
    }
    // Hide finalize button if present
    const finalize = document.getElementById("finalize-day-plan-btn");
    if (finalize) finalize.style.display = "none";
    // Update markers to show all places once day plan mode is off
    updateMapMarkersForDayPlan();
  }

  // Normalize the port name for storage and caching
  const normalizedName = normalizePortName(portName);
  currentPortKey = normalizedName; // 👈 remember which port we’re on
  document.getElementById("places").innerHTML = "🔍 Searching...";

  // Show skeleton cards while loading
  const placesContainer = document.getElementById("places");
  createSkeletonCards(placesContainer, 6); // Show 6 skeleton cards

  // Check IndexedDB for cached results within the last 30 days
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
    currentPortKey = normalizedName; // 👈 ensure it’s set when loading from cache
    initMap(cached.lat, cached.lon);
    renderPlaces(cached.places, cached.lat, cached.lon);
    return;
  }

  // Fetch coordinates from Nominatim via a CORS proxy and load places
  try {
    const geoUrl = `https://corsproxy.io/?https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(portName)}`;
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
  await ensurePlacesLoaded();
  const normalizeName = (n) => (n || '').trim().toLowerCase();
  const placeMap = new Map();

  const radius = 25000;
  const googleTypes = [
    "restaurant","tourist_attraction","shopping_mall","cafe","library","park","bar"
  ];

  const geoapifyCategories = [
    "catering.fast_food",
    "tourism","entertainment","adult.nightclub","leisure",
    "commercial.supermarket",
    "healthcare.hospital","healthcare.pharmacy","service.police",
    "service.financial.atm","service.financial.bank","service.financial.money_transfer",
    "accommodation.hotel"
  ].join(",");

  try {
    // ====== GOOGLE via JS library (no CORS, no corsproxy) ======
    const googleResults = [];
    for (const type of googleTypes) {
      try {
        const { results } = await nearbySearchAsync({
          location: new google.maps.LatLng(lat, lon),
          radius,
          type
        });

        (results || []).forEach((p) => {
          const pLat = p.geometry?.location?.lat();
          const pLon = p.geometry?.location?.lng();
          if (pLat == null || pLon == null) return;

          const distance = getDistance(lat, lon, pLat, pLon);
          const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
          const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));

          const photoUrl = (p.photos?.[0]?.getUrl({ maxWidth: 400 })) || null;

          const place = {
            name: p.name,
            lat: pLat,
            lon: pLon,
            type,
            distance,
            walkingTime: walk,
            drivingTime: drive,
            photoUrl,
            rating: p.rating || null,
            placeId: p.place_id || null
          };

          addPlace(place);                      // keep for caching
          renderIncrementally(place, lat, lon); // 👈 render each one now
        });

      } catch (e) {
        console.warn('Nearby failed for', type, e.message);
      }
    }

    // ====== GEOAPIFY stays the same (HTTP fetch) ======
    const geoRes = await fetch(
      `https://api.geoapify.com/v2/places?categories=${geoapifyCategories}&filter=circle:${lon},${lat},${radius}&limit=50&apiKey=${geoapifyKey}`
    ).then(r => r.json());

    // ====== Merge like before ======
    function addPlace(place) {
      const key = normalizeName(place.name);
      if (!placeMap.has(key)) {
        placeMap.set(key, place);
      } else if (place.distance < placeMap.get(key).distance) {
        placeMap.set(key, place);
      }
    }

    // Google → add items
    googleResults.forEach(({ type, results }) => {
      results.forEach((p) => {
        const pLat = p.geometry?.location?.lat();
        const pLon = p.geometry?.location?.lng();
        if (pLat == null || pLon == null) return;

        const distance = getDistance(lat, lon, pLat, pLon);
        const walk = formatDuration(Math.round((distance/2)*60 + Math.random()*5));
        const drive = formatDuration(Math.round((distance/10)*60 + Math.random()*5));

        // Photo URL via JS lib
        let photoUrl = null;
        if (Array.isArray(p.photos) && p.photos.length) {
          // getUrl builds a ready-to-use URL you can put in <img src>
          photoUrl = p.photos[0].getUrl({ maxWidth: 400 });
        }

        addPlace({
          name: p.name,
          lat: pLat,
          lon: pLon,
          type,
          distance,
          walkingTime: walk,
          drivingTime: drive,
          photoUrl,                   // NOTE: URL, not a photoref token
          rating: p.rating || null,
          placeId: p.place_id || null
        });
      });
    });

    // Geoapify → add items
    geoRes.features?.forEach((feat) => {
      const name = feat.properties?.name;
      if (!name) return;
      const pLat = feat.geometry.coordinates[1];
      const pLon = feat.geometry.coordinates[0];
      const distance = getDistance(lat, lon, pLat, pLon);
      const mappedType = mapGeoapifyToGoogleType(feat.properties);
      const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
      const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));

      const place = {
        name,
        lat: pLat,
        lon: pLon,
        type: mappedType,
        distance,
        walkingTime: walk,
        drivingTime: drive
        // (no photo)
      };

      addPlace(place);
      renderIncrementally(place, lat, lon);
    });

    const allPlaces = Array.from(placeMap.values()).sort((a,b) => a.distance - b.distance);
    allPlacesArray = allPlaces;

    // Save to cache (unchanged)
    const db = await openDB();
    const tx = db.transaction("places", "readwrite");
    tx.objectStore("places").put({
      port: portName,
      timestamp: Date.now(),
      lat, lon,
      places: allPlaces
    });

    renderPlaces(allPlaces, lat, lon);
  } catch (err) {
    console.error(err);
    document.getElementById("places").innerHTML = "⚠️ Error loading places.";
  }
}

function renderIncrementally(place, lat, lon) {
  const container = document.getElementById("places");

  // Remove skeletons on first result
  const skeletons = container.querySelectorAll(".skeleton-card");
  if (skeletons.length) container.innerHTML = "";

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${place.lat},${place.lon}&travelmode=walking`;

  const card = document.createElement("div");
  card.className = "place";
  card.setAttribute("data-type", place.type);
  card.setAttribute("data-lat", place.lat);
  card.setAttribute("data-lon", place.lon);
  if (place.placeId) card.setAttribute("data-placeid", place.placeId);
  if (place.rating) card.setAttribute("data-rating", place.rating);

  card.innerHTML = `
    <strong>${place.name}</strong>
    <div class="category">${place.type.replace(/_/g, " ")}</div>
    <div class="distance">🚶🏻 ${place.walkingTime} walk 🚗 ${place.drivingTime} drive (Our estimation)</div>
    <div class="directions-link">
      <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">📍 Get Directions</a>
    </div>
  `;

  container.appendChild(card);

  const marker = L.marker([place.lat, place.lon])
    .addTo(map)
    .bindPopup(`<strong>${place.name}</strong><br>${place.type}<br>🚶🏻 ${place.walkingTime} walk<br>🚗 ${place.drivingTime} drive`);
  markers.push(marker);
  allPlaceMarkers.push({
    marker,
    lat: place.lat,
    lon: place.lon,
    name: place.name,
    type: place.type,
    walkingTime: place.walkingTime,
    drivingTime: place.drivingTime
  });
}

function renderPlaces(placesArray, lat, lon) {
  currentPortForPlan = document.getElementById("cityInput").value.trim();
  // Persist the port coordinates globally so the day plan modal can compute
  // distances from the port to the first selected destination and back again.
  currentPortLat = lat;
  currentPortLon = lon;
  if (placesArray.length === 0) {
    document.getElementById("places").innerHTML = "❌ No places found.";
    document.getElementById("create-day-plan-btn").style.display = "none"; // 🛑 Hide if no places
    return;
  }
  let output = `<div>
    <em style="color: #888;"><br><b>💡 Tip 1:</b> Enter your exact port name for better results eg (ocho rios cruise terminal - Terminal Turística Amber Cove - Port de barcelona - Manila Pier 3 etc. or choose from our already curated list in the menu) 
    <br><br><b>💡 Tip 2:</b> Use the Create A Day Plan Feature to make custom lists of places to visit during shore day, finalize and share to family, friends or save for offline (access later in sidebar menu) or copy & paste in your device notes! </em></div>
    <h3 style="text-align:center; color:#444;">Nearby Attractions & Restaurants</h3>`;
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  // Clear stored markers when rendering a new list of places
  allPlaceMarkers = [];

  const highlightIndex = Math.floor(Math.random() * 12) + 2; // random between 2 and 14

// Advert Placement
const isMobile = window.innerWidth <= 768;
const adIndexes = new Set();
const total = placesArray.length;

// Target 7% of places for ad tiles
const adCount = Math.floor(total * 0.07);
if (total >= 3) adIndexes.add(isMobile ? 1 : 2); // Insert first ad at index 1 or 2

// Add remaining ads randomly (but avoid the first fixed index)
while (adIndexes.size < adCount) {
  const randIndex = Math.floor(Math.random() * total);
  if (!adIndexes.has(randIndex)) adIndexes.add(randIndex);
}

  for (let i = 0; i < placesArray.length; i++) {
  const place = placesArray[i];
  const isCruisersLoved = i === highlightIndex;
  const extraClass = isCruisersLoved ? " cruisers-loved" : "";

  if (adIndexes.has(i)) {
    output += createAdTile();
  }
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${place.lat},${place.lon}&travelmode=walking`;
     output += `<div class="place${extraClass}" data-type="${place.type}" data-placeid="${place.placeId || ''}" data-lat="${place.lat}" data-lon="${place.lon}" data-walk="${place.walkingTime}" data-drive="${place.drivingTime}" data-rating="${place.rating ?? ''}" style="position:relative;">
    <button class="share-place-btn" title="Share this place" aria-label="Share this place"
      style="position:absolute;top:8px;right:8px;border:none;color:#000000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:saturate(1.2);">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24" fill="currentColor" style="display:block">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>
    </button>
    <strong>
      ${isCruisersLoved ? '🌟 <span style="color:#d35400;">Cruisers Also Loved…</span><br>' : ''}
      ${place.name}
    </strong>
    <div class="category">${place.type.replace(/_/g, " ")}</div>
    <div class="distance">🚶🏻 ${place.walkingTime} walk 🚗 ${place.drivingTime} drive (Our estimation)</div>
    <div class="directions-link">
      <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">📍 Get Directions</a>
    </div>
    
      ${(place.photoUrl || place.photoRef) ? `
      <div class="place-image-container" style="display:none;">
        <img class="place-img" loading="lazy" alt="${place.name}"
            ${place.photoUrl ? `data-photo-url="${place.photoUrl}"` : ''}
            ${place.photoRef ? `data-photoref="${place.photoRef}"` : ''}>
      </div>
      <button class="view-more-btn" style="margin-top:5px;">View More</button>
    ` : ''}

    ${place.rating && (place.review || (place.reviews && place.reviews[0]?.text)) ? `
    <div class="place-review" style="display:none;">
      <p style="display:flex;">⭐ <strong>${place.rating}</strong></p> — <em>"${place.review || place.reviews[0].text}"</em>
    </div>
  ` : ''}
  </div>`;

    const marker = L.marker([place.lat, place.lon])
      .addTo(map)
      .bindPopup(`<strong>${place.name}</strong><br>${place.type}<br>🚶🏻 ${place.walkingTime} walk<br>🚗 ${place.drivingTime} drive`);
    markers.push(marker);
    // Store marker and its place info for quick re-use later
    allPlaceMarkers.push({
      marker,
      lat: place.lat,
      lon: place.lon,
      name: place.name,
      type: place.type,
      walkingTime: place.walkingTime,
      drivingTime: place.drivingTime
    });
  }

  output += `<button id="finalize-day-plan-btn" style="display:none; margin: 10px 7px; padding: 10px 20px; background: #28a745ab; color: white; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">
      Finalize My Day Plan
    </button>`;

      document.getElementById("places").innerHTML = output;
      // Bind Share buttons for each card
      document.querySelectorAll(".share-place-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const card = e.currentTarget.closest(".place");
          openShareCardModal(card, { portLat: lat, portLon: lon });
        });
      });

      document.getElementById("create-day-plan-btn").style.display = "inline-block";
      const finalizeBtn = document.getElementById("finalize-day-plan-btn");
        if (finalizeBtn) {
          finalizeBtn.addEventListener("click", () => {
            if (dayPlanSelections.size === 0) {
              alert("Select at least one place.");
              return;
            }
            showDayPlanModal(); // This will build and show the modal
          });
        }
     document.querySelectorAll(".view-more-btn").forEach((btn) => {
  btn.addEventListener("click", async function () {
    const card = this.closest(".place");
    const imgContainer = card.querySelector(".place-image-container");
    const img = imgContainer?.querySelector("img");
    let reviewDiv = card.querySelector(".place-review");
    const placeId = card.getAttribute("data-placeid");

    // SHOW case
    if (imgContainer && imgContainer.style.display === "none") {
      // ⬇️ load photo only once, preferring cached base64 from IndexedDB
      if (img && !img.src) {
        const direct = img.getAttribute('data-photo-url');
        if (direct) {
          img.src = direct; // URL from Places JS photo.getUrl()
        } else {
          const ref = img.getAttribute('data-photoref');
          if (ref) {
            img.src = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${ref}&key=${googleApiKey}`;
          }
        }
      }

      const isMobile = window.innerWidth <= 768;
      imgContainer.style.display = isMobile ? "flex" : "block";
      this.textContent = "Hide More";

      // If no review yet, try IndexedDB first; if missing, fetch, then persist
      if (!reviewDiv) {
        // 1) Try cached review (object) from IndexedDB for this card
        const cachedReview = await getCachedReviewForPlace(currentPortKey, card);
        if (cachedReview && cachedReview.text) {
          reviewDiv = document.createElement("div");
          reviewDiv.className = "place-review";
          const placeRating = card.getAttribute("data-rating") || "";
          reviewDiv.innerHTML = `<p style="display:flex;">⭐ <strong>${placeRating || '—'}</strong></p> — <em>"${cachedReview.text}"</em>`;
          card.appendChild(reviewDiv);
        } else if (placeId) {
          // 2) Fall back to your existing fetch (in-memory → Places Details)
          const review = await getReviewCached(placeId);
          if (review && review.text) {
            reviewDiv = document.createElement("div");
            reviewDiv.className = "place-review";
            const placeRating = card.getAttribute("data-rating") || "";
            reviewDiv.innerHTML = `<p style="display:flex;">⭐ <strong>${placeRating || '—'}</strong></p> — <em>"${review.text}"</em>`;
            card.appendChild(reviewDiv);

            // 3) Persist the full review object array (uses your existing helper)
            await cacheReviewsForPlace(currentPortKey, card, [review]); // ← was cacheReviewForPlace(...)
          }
        }
      } else {
        reviewDiv.style.display = "block";
      }

      // Enable zoom click on image (once)
      img?.addEventListener("click", function () {
        const overlay = document.createElement("div");
        overlay.style = `
          position: fixed; top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999;
        `;
        overlay.innerHTML = `<img src="${this.src}" style="max-width:90%; max-height:90%; border-radius:10px;">`;
        overlay.addEventListener("click", () => document.body.removeChild(overlay));
        document.body.appendChild(overlay);
      }, { once: true });

    // HIDE case
    } else {
      if (imgContainer) imgContainer.style.display = "none";
      if (reviewDiv) reviewDiv.style.display = "none";
      this.textContent = "View More";
    }
  });
});

// Advert Button
document.querySelectorAll(".shop-now-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    const modal = document.createElement("div");
    modal.style = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.8); display:flex;
      align-items:center; justify-content:center; z-index:9999;
    `;
    modal.innerHTML = `
      <div style="background:white; padding:20px; border-radius:8px; max-width:90%; text-align:center;">
        <h3>🚀 Premium Features</h3>
        <p>Coming soon: downloadable guides, shore itineraries, local deals, trip planning & more.</p>
        <button onclick="document.body.removeChild(this.parentElement.parentElement)"
          style="margin-top:10px; background:#007BFF; color:white; border:none; padding:8px 12px; border-radius:5px;">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  });
});
  updateSearchedPortsButton()
}

// *****************************************************************************************
// ===== Share Card Helpers (cruisesnitch.info) =====
const BRAND_NAME = "cruisesnitch.info";
const BRAND_ICON = "/icons/icon-512.png"; // used for actual shares (no Google photo)

function detectPlatform() {
  const ua = navigator.userAgent || "";
  return {
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
  };
}

function nativeMapsLink(lat, lon, name = "") {
  const encodedName = encodeURIComponent(name || "Destination");
  const { isIOS, isAndroid } = detectPlatform();
  if (isIOS)  return `http://maps.apple.com/?daddr=${lat},${lon}&q=${encodedName}`;
  if (isAndroid) return `geo:${lat},${lon}?q=${lat},${lon}(${encodedName})`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
}

async function openShareCardModal(card, { portLat, portLon }) {
  // Extract data from the tile
  const nameEl = card.querySelector("strong");
  const fullName = (nameEl ? nameEl.childNodes[nameEl.childNodes.length - 1].textContent : "").trim();
  const category = (card.querySelector(".category")?.textContent || "").trim();
  const distText = card.querySelector(".distance")?.textContent || "";
  let walk  = (card.dataset.walk  || "").trim();
  let drive = (card.dataset.drive || "").trim();
  // Fallback parsing (keeps hours + minutes intact)
  if (!walk) {
    const m = distText.match(/🚶🏻\s*([^🚗]+?)\s+walk/i);
    walk = (m?.[1] || "").trim(); // "7 hr 3 min"
  }
  if (!drive) {
    const m = distText.match(/🚗\s*([^()]+?)\s+drive/i);
    drive = (m?.[1] || "").trim(); // "1 hr 28 min"
  }
  const lat = parseFloat(card.getAttribute("data-lat"));
  const lon = parseFloat(card.getAttribute("data-lon"));
  // Prefer the exact directions link already rendered on the card.
  // Fallback builds it from the port coords you passed into openShareCardModal(...).
  const directionsUrlFromCard = card.querySelector(".directions-link a")?.href || "";
  const directionsUrl = directionsUrlFromCard
  || `https://www.google.com/maps/dir/?api=1&origin=${portLat},${portLon}&destination=${lat},${lon}&travelmode=walking`;
  const photo = card.querySelector(".place-image-container img")?.src || null;

  // Overlay + modal
  const overlay = document.createElement("div");
  overlay.style = "position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;";
  const modal = document.createElement("div");
  modal.style = "background:#fff;border-radius:12px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

 // Share card preview (only render image if we actually have one)
  const cardWrap = document.createElement("div");
  cardWrap.style = "display:flex;flex-direction:column;";

  const body = document.createElement("div");
  body.style = "padding:14px 16px 10px 16px;";

  // If the tile has a real photo, render it; otherwise skip image entirely
  const photoSrc = (photo && typeof photo === "string" && photo.trim()) ? photo : null;
  if (photoSrc) {
    const imgEl = document.createElement("img");
    imgEl.alt = fullName || "Photo";
    imgEl.src = photoSrc;
    imgEl.style = "width:100%;height:220px;object-fit:cover;display:block;";
    cardWrap.appendChild(imgEl);
  }
  body.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <img src="${BRAND_ICON}" alt="${BRAND_NAME}" width="18" height="18" style="border-radius:4px;"/>
    <div style="font-weight:700;font-size:14px;letter-spacing:.2px;color:#0ea5e9">${BRAND_NAME}</div>
  </div>
  <div style="font-weight:700;font-size:18px;line-height:1.2;margin-bottom:6px;">${fullName || "Unknown place"}</div>
  <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">${category}</div>
  <div style="font-size:14px;margin-bottom:10px;">🚶🏻 ${walk} walk &nbsp;•&nbsp; 🚗 ${drive} drive (estimate)</div>
  <div style="display:flex;gap:8px;margin-bottom:12px;">
    <a href="${directionsUrl}" target="_blank"
       style="text-decoration:none;padding:10px 12px;border-radius:8px;background:#0d6efd;color:#fff;display:inline-block;">
       Open in Maps
    </a>
    <a href="https://${BRAND_NAME}" target="_blank"
       style="text-decoration:none;padding:10px 12px;border-radius:8px;background:#10b981;color:#fff;display:inline-block;">
       ${BRAND_NAME}
    </a>
  </div>
  <div style="font-size:12px;color:#9ca3af;border-top:1px solid #eef2f7;padding-top:8px;">Shared via ${BRAND_NAME}</div>
`;

  cardWrap.appendChild(body);

  // Actions (Share / Close)
const actions = document.createElement("div");
actions.style = "display:flex;gap:8px;justify-content:flex-end;padding:12px 12px 14px 12px;border-top:1px solid #f1f5f9;";
const shareBtn = document.createElement("button");
shareBtn.textContent = "Share";
shareBtn.style = "padding:10px 14px;border:none;border-radius:8px;background:#0ea5e9;color:#fff;cursor:pointer;font-weight:600;";
const closeBtn = document.createElement("button");
closeBtn.textContent = "Close";
closeBtn.style = "padding:10px 14px;border:none;border-radius:8px;background:#6b7280;color:#fff;cursor:pointer;";

actions.appendChild(shareBtn);
actions.appendChild(closeBtn);

modal.appendChild(cardWrap);
modal.appendChild(actions);
overlay.appendChild(modal);
document.body.appendChild(overlay);

closeBtn.onclick = () => document.body.removeChild(overlay);

// Share: just send the URL with the current #cityInput value appended
shareBtn.onclick = async () => {
  const input = document.getElementById("cityInput");
  let term = normalizeSpaces(input?.value || "");

  // fallback to the card’s name if input empty
  if (!term) {
    const nameEl = card.querySelector("strong");
    term = normalizeSpaces((nameEl ? nameEl.childNodes[nameEl.childNodes.length - 1].textContent : ""));
  }

  const shareUrl = buildShareUrl(term);

  // Pre-copy (no UI), helps when a target app mangles the previewed URL
  try { await navigator.clipboard.writeText(shareUrl); } catch {}

  try {
    if (navigator.share) {
      // Share ONLY the URL — letting apps derive the preview
      await navigator.share({ url: shareUrl });
    } else {
      // Fallback: copy already done; also show a hint
      alert("Link copied to clipboard.");
    }
  } catch (e) {
    console.error(e);
    alert("Couldn’t share. Link is in your clipboard.");
  }
};
}

// Draw a small, branded share image (brand icon on top; no Google place photo)
async function buildShareImage({ name, category, walk, drive }) {
  const W = 720, H = 560, pad = 24;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // card background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  // brand stripe
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(0,0,W,64);

  // brand icon
  try {
    const icon = await loadImage(BRAND_ICON);
    const s = 36;
    ctx.drawImage(icon, pad, 14, s, s);
  } catch(_) {}

  // brand name
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(BRAND_NAME, pad + 48, 40);

  // title & meta
  let y = 64 + pad;
  ctx.fillStyle = "#111827";
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, name || "Unknown place", pad, y, W - pad*2, 36);
  y += 70;

  ctx.fillStyle = "#6b7280";
  ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, category || "", pad, y, W - pad*2, 28);
  y += 40;

  ctx.fillStyle = "#111827";
  ctx.font = "500 20px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, `🚶🏻 ${walk}   •   🚗 ${drive} (est)`, pad, y, W - pad*2, 28);

  const blob = await new Promise(res => canvas.toBlob(res, "image/png", 0.92));
  if (!blob) return null;
  return new File([blob], "cruisesnitch-share.png", { type: "image/png" });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image-load-failed"));
    i.src = src; // same-origin icon; no CORS issues
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text||"").split(/\s+/);
  let line = "", yy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line ? line + " " + words[n] : words[n];
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n];
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

// Normalize funky spaces → single normal spaces
function normalizeSpaces(str = "") {
  return str
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Build a shareable URL with ?q=... using the URL API (handles encoding)
function buildShareUrl(searchTerm) {
  const term = normalizeSpaces(searchTerm);
  const url = new URL(location.href);
  url.search = "";                         // clear existing query
  if (term) url.searchParams.set("q", term);
  return url.toString();                   // e.g. ?q=Port%20of%20Piraeus
}

// Read the term back from URL
function getSearchTermFromURL() {
  const q = new URLSearchParams(location.search).get("q");
  return q ? normalizeSpaces(q.replace(/\+/g, " ")) : "";
}

document.addEventListener("DOMContentLoaded", () => {
  const term = getSearchTermFromURL();
  if (!term) return;
  const input = document.getElementById("cityInput");
  if (!input) return;
  input.value = term;
  setTimeout(() => {
    if (typeof searchCity === "function") searchCity();
    else document.getElementById("search-btn")?.click();
  }, 0);
});

// ***************************************************************************
const reviewCache = new Map();
async function getReviewCached(placeId) {
  if (reviewCache.has(placeId)) return reviewCache.get(placeId);
  const r = await fetchHighRatedReview(placeId);
  reviewCache.set(placeId, r || null);
  return r;
}

async function fetchHighRatedReview(placeId) {
  await ensurePlacesLoaded();
  try {
    const place = await getDetailsAsync({
      placeId,
      fields: ['rating','reviews'] // keep it lean
    });
    if (!place || !Array.isArray(place.reviews) || !place.reviews.length) return null;

    // simple pick: any review with text; prefer ≥ 4.5
    const withText = place.reviews.filter(r => (r.text || '').trim().length);
    const highRated = withText.find(r => r.rating >= 4.5) || withText[0] || null;

    // Return the text; use the card’s place rating for the star (you already store rating)
    return highRated ? { text: highRated.text, rating: place.rating ?? null } : null;
  } catch (err) {
    console.error("Review fetch failed", err);
    return null;
  }
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

  // Update the Day Plans button count on initial load
  updateDayPlansButton();
};

// ******************************************************************************************************
function showDayPlanModal() {
  const modal = document.getElementById("day-plan-modal");
  const list = document.getElementById("day-plan-list");
  const title = document.getElementById("day-plan-title");

  // Reset the list content for the new plan
  list.innerHTML = "";

  // Retrieve and capitalize the current port name for the modal title
  const portName = document.getElementById("cityInput").value.trim() || "Your Port";
  title.textContent = `MY ${portName.toUpperCase()} SHORE DAY PLAN`;

  // Collect all selected cards in insertion order and extract their details
  const items = [];
  dayPlanSelections.forEach((card) => {
    const nameElem = card.querySelector("strong");
    const name = nameElem
      ? nameElem.childNodes[nameElem.childNodes.length - 1].textContent.trim()
      : "";
    const distanceText = card.querySelector(".distance")?.textContent || "";
    const walkMatch = distanceText.match(/🚶🏻\s(.+?)\s/);
    const driveMatch = distanceText.match(/🚗\s(.+?)\s/);
    const walkTime = walkMatch ? walkMatch[1] + " min (estimate)" : "";
    const driveTime = driveMatch ? driveMatch[1] + " min (estimate)" : "";
    const directions = card.querySelector("a")?.href || "";
    const lat = parseFloat(card.getAttribute("data-lat"));
    const lon = parseFloat(card.getAttribute("data-lon"));
    items.push({ name, walkTime, driveTime, directions, lat, lon });
  });

  // Helper to derive walking and driving durations from a distance (in km)
  function computeDurations(distanceKm) {
    const walkMins = (distanceKm / 2) * 60;
    const driveMins = (distanceKm / 10) * 60;
    const walk = formatDuration(Math.round(walkMins + Math.random() * 5));
    const drive = formatDuration(Math.round(driveMins + Math.random() * 5));
    return { walk, drive };
  }

  // We accumulate a human‑readable text version of the itinerary for copy/share
  const planItems = [];

  // If we know the port coordinates and have at least one selected place, add a START block
  if (currentPortLat !== null && currentPortLon !== null && items.length > 0) {
    const first = items[0];
    const distKm = getDistance(currentPortLat, currentPortLon, first.lat, first.lon);
    const distMi = distKm * 0.621371;
    // Add a START block summarizing the distance and travel times to the first destination
    list.innerHTML +=
      '<li class="plan-start"><strong>START</strong><br></li>';
    planItems.push(
      'START\n' +
      distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi\n🚶🏻 ' +
      first.walkTime + '\n🚗 ' + first.driveTime
    );
    // Then add a connector showing the distance and travel times from start to the first destination
    const durations = computeDurations(distKm);
    list.innerHTML +=
      '<div class="plan-connector"><div class="line"></div><div class="distance-label">' +
      distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi away<br>' +
      '🚶🏻 ' + durations.walk + ' walk (estimate) <br>' +
      '🚗 ' + durations.drive +
      ' drive (estimate)</div></div>';
    planItems.push(
      'To the next stop is: ' +
      distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi away\n🚶🏻 ' +
      durations.walk + ' walk (estimate)' + '\n🚗 ' + durations.drive + ' drive (estimate)'
    );
  }

  // Iterate through each selected destination and build the list with connectors
  items.forEach((item, idx) => {
    // Add the destination information
    list.innerHTML +=
      '<li class="plan-item"><strong>' +
      item.name +
      '</strong><br><a href="' +
      item.directions +
      '" target="_blank">📍 Directions</a></li>';
    planItems.push(item.name + '\n📍 ' + item.directions);

    // If there is a subsequent destination, insert a connector with distance and times
    if (idx < items.length - 1) {
      const next = items[idx + 1];
      const distKm = getDistance(item.lat, item.lon, next.lat, next.lon);
      const distMi = distKm * 0.621371;
      const durations = computeDurations(distKm);
      list.innerHTML +=
        '<div class="plan-connector"><div class="line"></div><div class="distance-label">' +
        distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi away<br>' +
        '🚶🏻 ' + durations.walk + ' walk (estimate) <br>' +
        '🚗 ' + durations.drive +
        ' drive (estimate)</div></div>';
      planItems.push(
        'To the next stop is: ' +
        distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi away\n🚶🏻 ' +
        durations.walk + ' walk (estimate)' + '\n🚗 ' + durations.drive + ' drive (estimate)'
      );
    }
  });

  // At the end of the itinerary, add a return connector and a "BACK TO" entry if applicable
  if (currentPortLat !== null && currentPortLon !== null && items.length > 0) {
    const last = items[items.length - 1];
    const distKm = getDistance(last.lat, last.lon, currentPortLat, currentPortLon);
    const distMi = distKm * 0.621371;
    const returnDurations = computeDurations(distKm);
    // Connector summarizing the return leg
    list.innerHTML +=
      '<div class="plan-connector"><div class="line"></div><div class="distance-label">' +
      distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi back<br>' +
      '🚶🏻 ' + returnDurations.walk + ' walk (estimate) <br>' +
      '🚗 ' + returnDurations.drive +
      ' drive (estimate)</div></div>';
    planItems.push(
      distKm.toFixed(2) + ' km / ' + distMi.toFixed(2) + ' mi\n🚶🏻 ' +
      returnDurations.walk + ' walk (estimate)' + '\n🚗 ' + returnDurations.drive + ' drive (estimate)'
    );
    // The final item indicating return to port
    list.innerHTML +=
      '<li class="plan-item"><strong>BACK TO ' + portName.toUpperCase() + '</strong></li>';
    planItems.push('BACK TO ' + portName.toUpperCase());
  }

  // Bind copy button
  document.getElementById("copy-plan-btn").onclick = function () {
    const fullText = title.textContent + '\n\n' + planItems.join('\n\n');
    navigator.clipboard.writeText(fullText).then(() => alert("Copied to clipboard!"));
  };

  // Bind share button
  document.getElementById("share-plan-btn").onclick = function () {
    const fullText = title.textContent + '\n\n' + planItems.join('\n\n');
    if (navigator.share) {
      navigator
        .share({ title: title.textContent, text: fullText })
        .catch((err) => alert("Share failed or canceled."));
    } else {
      alert("Sharing not supported. Please copy instead.");
    }
  };

  // Store the generated plan data so it can be saved for offline access. We use
  // shallow copies for the items array and a snapshot of the current HTML.
  lastGeneratedPlanItems = planItems.slice();
  lastGeneratedPlanHTML = list.innerHTML;
  lastGeneratedPlanTitle = title.textContent;

  // Create or locate a "Save Plan" button and attach a handler to persist the current plan
  let saveBtn = document.getElementById("save-plan-btn");
  if (!saveBtn) {
    const shareBtn = document.getElementById("share-plan-btn");
    const copyBtn = document.getElementById("copy-plan-btn");
    saveBtn = document.createElement("button");
    saveBtn.id = "save-plan-btn";
    saveBtn.textContent = "Save Plan";
    // Basic styling: align with existing action buttons
    saveBtn.style.marginLeft = "10px";
    saveBtn.style.padding = copyBtn ? copyBtn.style.padding : "8px 14px";
    saveBtn.style.cursor = "pointer";
    saveBtn.style.backgroundColor = "#ffc107";
    saveBtn.style.color = "#fff";
    saveBtn.style.border = "none";
    saveBtn.style.borderRadius = "4px";
    if (shareBtn && shareBtn.parentNode) {
      // Insert after the share button
      shareBtn.parentNode.insertBefore(saveBtn, shareBtn.nextSibling);
    } else if (copyBtn && copyBtn.parentNode) {
      copyBtn.parentNode.appendChild(saveBtn);
    } else {
      // Fallback: append to modal
      modal.appendChild(saveBtn);
    }
  }
  saveBtn.onclick = function () {
    saveCurrentDayPlan();
  };

  // Display the modal
  modal.style.display = 'flex';
}

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

  document.getElementById("load-cruise-health").addEventListener("click", () => {
    loadDynamicSidebar("/json/cruise-ships.json", "cruiseHealth");
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
  tipsContainer.innerHTML = "<p style='opacity:0.7;'>Loading latest news…</p>";
  dynamicDiv.appendChild(tipsContainer);

  (async () => {
    const rssFeeds = [
      { name: "Google Cruise News", url: "https://news.google.com/rss/search?q=intitle:cruise+(%22cruise+ship%22+OR+%22cruise+line%22)+-tom+-missile&hl=en-US&gl=US&ceid=US:en" },
      { name: "Cruise Hive",      url: "https://www.cruisehive.com/feed" },
      { name: "Cruise Fever",     url: "https://cruisefever.net/feed/" },
      { name: "Cruise Radio",     url: "https://cruiseradio.net/feed/" },
      { name: "Cruise Miss",      url: "https://cruisemiss.com/feed/" },
      { name: "Cruise Mummy",     url: "https://www.cruisemummy.co.uk/feed/" },
      { name: "Royal Caribbean Blog", url: "https://www.royalcaribbeanblog.com/rss.xml" },
      { name: "Cruise Law News",  url: "https://www.cruiselawnews.com/feed/" },
      { name: "Cruzely",          url: "https://www.cruzely.com/feed/" },
      { name: "All Things Cruise", url: "https://allthingscruise.com/feed/" },
      { name: "Cruise Port Advisor", url: "https://cruiseportadvisor.com/feed/" },
      { name: "Travel Agent Central", url: "https://www.travelagentcentral.com/rss/cruises/xml" },
      { name: "Eat Sleep Cruise", url: "https://eatsleepcruise.com/feed/" },
      { name: "Chris Cruises", url: "https://www.chriscruises.com/feed/" },
      { name: "Sail Away Blog", url: "https://americasbestcruises.com/feed/" },
      { name: "Life Well Cruised", url: "https://lifewellcruised.com/feed/" }
    ];

    async function fetchFeed(feed) {
      const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
      try {
        const response = await fetch(apiUrl);
        const json = await response.json();
        if (!json || json.status !== "ok" || !Array.isArray(json.items)) return [];
        let items = json.items;
        items.sort(() => Math.random() - 0.5);
        const count = Math.floor(Math.random() * 4) + 5;
        items = items.slice(0, count);
        return items.map(item => {
          // Choose an image by priority:
          // 1. item.thumbnail
          // 2. enclosure.link if type starts with "image"
          // 3. first <img> in content
          // 4. first <img> in description
          let img = item.thumbnail || "";
          if (
            !img &&
            item.enclosure &&
            item.enclosure.link &&
            item.enclosure.type &&
            item.enclosure.type.startsWith("image")
          ) {
            img = item.enclosure.link;
          }
          // Search in 'content' for first <img src="...">
          function extractImg(html) {
            if (!html) return "";
            const match = html.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
            return match ? match[1] : "";
          }
          if (!img) {
            img = extractImg(item.content);
          }
          if (!img) {
            img = extractImg(item.description);
          }
          return {
            feedName: feed.name,
            title: item.title,
            link: item.link,
            date: new Date(item.pubDate),
            description: (item.content || item.description || "").replace(/<[^>]+>/g, ""),
            image: img
          };
        });
      } catch (err) {
        console.warn(`RSS feed unreachable: ${feed.name}`, err);
        return [];
      }
    }

    const results = await Promise.all(rssFeeds.map(fetchFeed));
    const sections = {};
    results.forEach((items, idx) => {
      if (items.length > 0) {
        sections[rssFeeds[idx].name] = items;
      }
    });

    // Flatten all feed items into one array for sorting
    const allItems = [];
    Object.keys(sections).forEach(feedName => {
      sections[feedName].forEach(item => {
        allItems.push(item);
      });
    });

    // Build search UI
    tipsContainer.innerHTML = "";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search cruise news…";
    searchInput.className = "search-bar";
    searchInput.style = "width:auto; padding:0.5rem; margin-bottom:1rem; border-radius:6px; border:1px solid #ccc;";
    const resultsContainer = document.createElement("div");

    // … the fetchFeed function and sections building remain as before …

function renderNews(filter = "") {
  resultsContainer.innerHTML = "";
  const filterLower = filter.toLowerCase();

    // Filter by search and sort by date descending
    const filtered = allItems
      .filter(item =>
        item.title.toLowerCase().includes(filterLower) ||
        item.description.toLowerCase().includes(filterLower)
      )
      .sort((a, b) => b.date - a.date); // newest first

    if (filtered.length === 0) {
      resultsContainer.innerHTML = "<p style='opacity:0.7;'>No matching news found.</p>";
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.style = "margin-bottom:1rem; border:1px solid #eee; border-radius:6px; overflow:hidden;";

      // Image at top (hide if it fails to load)
      if (item.image) {
        const imgEl = new Image();
        imgEl.src = item.image;
        imgEl.alt = "";
        imgEl.loading = "lazy";
        imgEl.crossOrigin = "anonymous";
        imgEl.style = "width:100%; height:140px; object-fit:cover; display:block;";
        imgEl.onerror = () => {
          imgEl.style.display = "none";
        };
        card.appendChild(imgEl);
      }
      // Content container
      const content = document.createElement("div");
      content.style = "padding:0.5rem;";
      const dateStr = item.date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });

      // Limit description to roughly eight lines / 400 chars
      const descText = item.description.length > 400
        ? item.description.substring(0, 400).trim() + "…"
        : item.description;

      const titleLink = document.createElement("a");
      titleLink.href = item.link;
      titleLink.target = "_blank";
      titleLink.rel = "noopener";
      titleLink.style = "color: var(--primary); text-decoration: underline;";
      titleLink.textContent = item.title;

      const titleStrong = document.createElement("strong");
      titleStrong.appendChild(titleLink);

      // Include feed name so readers know the source
      const sourceSmall = document.createElement("small");
      sourceSmall.style = "color:#888;";
      sourceSmall.textContent = item.feedName;

      const dateSmall = document.createElement("small");
      dateSmall.style = "color:#d6162c;";
      dateSmall.textContent = dateStr;

      const descSpan = document.createElement("span");
      descSpan.textContent = descText;
      descSpan.style = "display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:8; overflow:hidden;";

      // Assemble the content
      content.appendChild(titleStrong);
      content.appendChild(document.createElement("br"));
      content.appendChild(sourceSmall);  // add the source before the date
      content.appendChild(document.createTextNode(" • "));
      content.appendChild(dateSmall);
      content.appendChild(document.createElement("br"));
      content.appendChild(descSpan);

      card.appendChild(content);
      resultsContainer.appendChild(card);
    });
  }
    searchInput.addEventListener("input", e => {
      renderNews(e.target.value);
    });

    tipsContainer.appendChild(searchInput);
    tipsContainer.appendChild(resultsContainer);
    renderNews();
  })();
}

if (type === "cruiseHealth") {
  const trackerWrap = document.createElement("div");
  trackerWrap.innerHTML = "<p style='opacity:0.7;'>Loading ships…</p>";
  dynamicDiv.appendChild(trackerWrap);

  (async () => {
    // ---------- 0) ONE BACK BUTTON (reuse if exists) ----------
    let globalBack = dynamicDiv.querySelector(".newSidebarList");
    if (!globalBack) {
      globalBack = document.createElement("button");
      globalBack.className = "list-btn newSidebarList";
      globalBack.textContent = "↩ back";
      globalBack.style.marginBottom = "0.5rem";
      dynamicDiv.prepend(globalBack);
    }

    // ---------- 1) LOAD SHIP NAMES (strings; {ship} also allowed) ----------
    const shipsJsonUrl = "/json/cruise-ships.json";
    let shipListRaw = [];
    try {
      const r = await fetch(shipsJsonUrl);
      shipListRaw = await r.json();
    } catch (e) {
      trackerWrap.innerHTML = "<p style='opacity:0.7;'>Unable to load ship list.</p>";
      return;
    }
    const shipsAll = shipListRaw
      .map(s => (typeof s === "string" ? s : (s && s.ship) ? s.ship : ""))
      .filter(Boolean);

    // ---------- 2) LOAD NEWS FEEDS ONCE ----------
    const rssFeeds = [
      { name: "Google Cruise News", url: "https://news.google.com/rss/search?q=intitle:cruise+(%22cruise+ship%22+OR+%22cruise+line%22)+-tom+-missile&hl=en-US&gl=US&ceid=US:en" },
      { name: "Cruise Hive",      url: "https://www.cruisehive.com/feed" },
      { name: "Cruise Fever",     url: "https://cruisefever.net/feed/" },
      { name: "Cruise Radio",     url: "https://cruiseradio.net/feed/" },
      { name: "Cruise Miss",      url: "https://cruisemiss.com/feed/" },
      { name: "Cruise Mummy",     url: "https://www.cruisemummy.co.uk/feed/" },
      { name: "Royal Caribbean Blog", url: "https://www.royalcaribbeanblog.com/rss.xml" },
      { name: "Cruise Law News",  url: "https://www.cruiselawnews.com/feed/" },
      { name: "Cruzely",          url: "https://www.cruzely.com/feed/" },
      { name: "All Things Cruise", url: "https://allthingscruise.com/feed/" },
      { name: "Cruise Port Advisor", url: "https://cruiseportadvisor.com/feed/" },
      { name: "Travel Agent Central", url: "https://www.travelagentcentral.com/rss/cruises/xml" },
      { name: "Eat Sleep Cruise", url: "https://eatsleepcruise.com/feed/" },
      { name: "Chris Cruises", url: "https://www.chriscruises.com/feed/" },
      { name: "Sail Away Blog", url: "https://americasbestcruises.com/feed/" },
      { name: "Life Well Cruised", url: "https://lifewellcruised.com/feed/" },
      // keep Reddit only if you're confident in your rate limits
      { name: "Reddit r/Cruise (new)",            url: "https://www.reddit.com/r/Cruise/new/.rss" },
      { name: "Reddit r/Cruises (new)",           url: "https://www.reddit.com/r/Cruises/new/.rss" },
      { name: "Reddit r/royalcaribbean (new)",    url: "https://www.reddit.com/r/royalcaribbean/new/.rss" },
      { name: "Reddit r/CarnivalCruiseFans (new)",url: "https://www.reddit.com/r/CarnivalCruiseFans/new/.rss" },
      { name: "Reddit r/dcl (new)",               url: "https://www.reddit.com/r/dcl/new/.rss" }
    ];

    async function fetchFeed(feed) {
      const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
      try {
        const response = await fetch(apiUrl);
        const json = await response.json();
        if (!json || json.status !== "ok" || !Array.isArray(json.items)) return [];
        return json.items.map(item => ({
          feedName: feed.name,
          title: item.title || "",
          link: item.link,
          date: new Date(item.pubDate),
          description: (item.content || item.description || "").replace(/<[^>]+>/g, "")
        }));
      } catch { return []; }
    }

    const feedResults = await Promise.all(rssFeeds.map(fetchFeed));
    const allArticles = [];
    feedResults.forEach(arr => arr.forEach(it => allArticles.push(it)));

    // ---------- 3) HELPERS: cache (with version) + STRICT exact-title matching ----------
    const CH_CACHE_TTL_MS = 30 * 60 * 1000;
    const CH_CACHE_NS = "v2-title-only"; // bump to invalidate old scores
    function cacheKeyFor(ship) { return `ch:${CH_CACHE_NS}:ship:${ship.toLowerCase()}`; }
    function chGetCache(k) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || !obj.t || typeof obj.v === "undefined") return null;
        if (Date.now() - obj.t > CH_CACHE_TTL_MS) return null;
        return obj.v;
      } catch { return null; }
    }
    function chSetCache(k, v) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch {} }

    function norm(s = "") {
      return s
        .toLowerCase()
        .replace(/&amp;/g, "&")
        .replace(/[‘’ʼ´`]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    // STRICT: title-only exact ship name (word-boundary-ish)
    function exactTitleMatch(article, ship) {
      const nt = norm(article.title || "");
      const ns = norm(ship);
      if (!nt || !ns) return false;
      const rx = new RegExp(`(?:^|\\s)${ns.replace(/\s+/g, "\\s+")}(?:\\s|$)`, "i");
      return rx.test(nt);
    }

    function sourceWeight(src = "") {
      const s = (src || "").toLowerCase();
      if (!s) return 0.8;
      if (/(ap|reuters|bbc|cruzely|cruise mummy|cruise radio|cruise fever|cruise hive|royal caribbean blog|cnn|miami herald|bloomberg|associated press|guardian|usa today|cruise\s*industry|cruise\s*news)/i.test(s)) return 1.0;
      if (/(cruisecritic|reddit|forum|blog|facebook|x\.com|twitter|tiktok|instagram)/i.test(s)) return 0.6;
      return 0.8;
    }
    function recencyWeight(d) {
      const t = new Date(d).getTime(); if (isNaN(t)) return 0.6;
      const hrs = (Date.now() - t) / 3600e3;
      if (hrs <= 6) return 1.0;
      if (hrs <= 24) return 0.9;
      if (hrs <= 72) return 0.75;
      if (hrs <= 168) return 0.6;
      return 0.45;
    }
    // Simplified keyword-only disruption signals (max-hit per article)
    const CH_SEVERITY = [
      // Highest impact
      { rx: /\b(cancel|canceled|cancelled|cancellation)\b/i, weight: 80 },

      // Life-safety / critical events
      { rx: /\b(overboard|fell|falls|alpha|oscar|coast guard)\b/i, weight: 55 },
      { rx: /\b(fire|smoke|alarm|alert)\b/i, weight: 65 },
      { rx: /\b(collision|allision|grounding|aground|crash|crashes|crashed|slams|hits|accident)\b/i, weight: 60 },
      { rx: /\b(engine|mechanical|propulsion|azipod|thruster)\b/i, weight: 45 },
      { rx: /\b(blackout|outage)\b/i, weight: 40 },
      { rx: /\b(flooding|leak|leakage|ingress)\b/i, weight: 45 },
      { rx: /\b(norovirus|covid|outbreak)\b/i, weight: 35 },
      { rx: /\b(death|dead|fatality|fatalities|died|killed|killing|stabbed|stabbing)\b/i, weight: 35 },
      { rx: /\b(listing|heel|heeling|tilt|tilting)\b/i, weight: 30 },
      { rx: /\b(arrest|arrested|detained|custody|fight|brawl|clash|injury|injured)\b/i, weight: 30 },
      { rx: /\b(medevac|airlift|airlifted|helicopter|evacuated|evacuates)\b/i, weight: 25 },

      // Operational impacts
      { rx: /\b(itinerary|schedule|rerouted|diverted|reroute|diverts|skipped|substitute)\b/i, weight: 25 },
      { rx: /\b(closure|congestion)\b/i, weight: 25 },
      { rx: /\b(strike|pause|dry dock)\b/i, weight: 55 },
      { rx: /\b(quarantine|isolation|removed)\b/i, weight: 25 },
      { rx: /\b(delays|delayed|change|changes|late)\b/i, weight: 18 },
      { rx: /\b(tender|tendering)\b/i, weight: 18 },
      { rx: /\b(customs|immigration|cbp)\b/i, weight: 15 },

      // Weather / environment / security
      { rx: /\b(hurricane|cyclone|typhoon|tsunami|storm|depression|gale|swell|rogue|weather)\b/i, weight: 45 },
      { rx: /\b(environmental|emissions|violation|fine)\b/i, weight: 20 },
      { rx: /\b(security|bomb|threat|attacked|explosion|explosive)\b/i, weight: 60 },
      { rx: /\b(rescue|sar)\b/i, weight: 20 },
      { rx: /\b(shortage)\b/i, weight: 20 }
    ];

    function scoreFromArticles(articles) {
      if (!articles.length) return 100; // no exact-title news = green
      let score = 100;
      for (const a of articles) {
        const text = [a.title, a.description].filter(Boolean).join(" ");
        let hit = 0;
        for (const r of CH_SEVERITY) if (r.rx.test(text)) hit = Math.max(hit, r.weight);
        if (hit > 0) {
          const pen = Math.round(hit * recencyWeight(a.date) * sourceWeight(a.feedName));
          score -= pen;
        }
      }
      return Math.max(0, Math.min(100, score));
    }
    function colorForScore(score) {
      return score >= 80 ? "#22c55e" : score >= 20 ? "#f59e0b" : "#ef4444"; // green / amber / red
    }

    // ---------- 4) VIEW STATE + BACK WIRING ----------
    let currentFilter = "";
    function setBackFor(view) {
      if (view === "list") {
        globalBack.onclick = () => {
          dynamicDiv.style.display = "none";
          document.getElementById("sidebar-default").style.display = "block";
        };
      } else {
        globalBack.onclick = () => {
          renderListView();
          filterShips(currentFilter);
        };
      }
    }

    // ---------- 5) SHARED ELEMENTS ----------
    const title = document.createElement("h4");
    title.textContent = "Cruise Health Tracker";
    title.style.marginTop = "0";

    const legend = document.createElement("div");
    legend.style.cssText = "color:#64748b;font-size:10px;margin:0.25rem 0 0.5rem;font-weight: 500;";
    legend.innerHTML =
      `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;vertical-align:middle;"></span> Normal sailing
       &nbsp;
       <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;vertical-align:middle;"></span> Potential disruption
       &nbsp;
       <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;vertical-align:middle;"></span> High risk`;

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search ship…";
    search.className = "search-bar";
    search.style.cssText = "width:auto;padding:0.5rem;margin:0.5rem 0 0.75rem;border-radius:6px;border:1px solid #ccc;";

    const list = document.createElement("div");
    const newsBox = document.createElement("div");

    // ---------- 6) LIST (dots RIGHT; strict title-only matching; versioned cache) ----------
    function renderShipRows(names) {
      list.innerHTML = "";
      const frag = document.createDocumentFragment();

      names.forEach((ship) => {
        const row = document.createElement("div");
        row.className = "searched-port-row";

        const btn = document.createElement("button");
        btn.className = "list-btn";
        btn.type = "button"; // prevent form-submits on mobile
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "space-between";
        btn.style.gap = "12px";
        btn.setAttribute("data-inside-sidebar", "1");

        const left = document.createElement("span");
        left.textContent = ship;

        const right = document.createElement("span");
        right.style.display = "inline-flex";
        right.style.alignItems = "center";
        right.style.justifyContent = "center";
        right.style.minWidth = "18px";

        const dot = document.createElement("span");
        dot.style.cssText = "display:inline-block;width:12px;height:12px;border-radius:50%;background:#cbd5e1;"; // neutral
        right.appendChild(dot);

        btn.appendChild(left);
        btn.appendChild(right);

        // Prevent mobile/global "click outside sidebar" handlers from closing it
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          showNewsView(ship);
        });

        row.appendChild(btn);
        frag.appendChild(row);

        // Lazy strict-title score & color (with versioned cache)
        queueMicrotask(() => {
          const k = cacheKeyFor(ship);
          let score = chGetCache(k);
          if (score === null) {
            const exactArticles = allArticles.filter(a => exactTitleMatch(a, ship)).slice(0, 50);
            score = scoreFromArticles(exactArticles);
            chSetCache(k, score);
          }
          dot.style.background = colorForScore(score);
        });
      });

      list.appendChild(frag);
    }

    function filterShips(q) {
      const f = (q || "").trim().toLowerCase();
      currentFilter = f;
      const filtered = !f ? shipsAll : shipsAll.filter(name => name.toLowerCase().includes(f));
      renderShipRows(filtered.slice(0, 300));
    }

    // ---------- 7) LIST VIEW ----------
    function renderListView() {
      trackerWrap.innerHTML = "";
      trackerWrap.appendChild(title);
      trackerWrap.appendChild(legend);
      trackerWrap.appendChild(search);
      trackerWrap.appendChild(list);
      setBackFor("list");
    }

    // ---------- 8) NEWS VIEW (ONLY news; and write back green=100 if none) ----------
    function showNewsView(ship) {
      trackerWrap.innerHTML = "";
      setBackFor("news");

      newsBox.innerHTML = "<p style='color:#64748b;font-size:12px;'>Fetching latest news…</p>";
      trackerWrap.appendChild(newsBox);

      const exactArticles = allArticles
        .filter(a => exactTitleMatch(a, ship))
        .sort((a,b) => b.date - a.date)
        .slice(0, 50);

      if (!exactArticles.length) {
        // ensure consistency: write GREEN to cache immediately
        chSetCache(cacheKeyFor(ship), 100);
        newsBox.innerHTML = "<p style='color:#64748b;font-size:12px;'>No disruptions detected for this cruise ship. ✅</p>";
        return;
      }

      const frag = document.createDocumentFragment();
      exactArticles.forEach(item => {
        const card = document.createElement("div");
        card.className = "searched-port-row";

        const aTag = document.createElement("a");
        aTag.href = item.link;
        aTag.target = "_blank";
        aTag.rel = "noopener";
        aTag.textContent = item.title || "(untitled)";
        aTag.style.textDecoration = "underline";

        const small = document.createElement("div");
        small.style.cssText = "color:#64748b;font-size:12px;";
        const dateStr = item.date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
        small.textContent = `${item.feedName} • ${dateStr}`;

        card.appendChild(aTag);
        card.appendChild(small);
        frag.appendChild(card);
      });
      newsBox.innerHTML = "";
      newsBox.appendChild(frag);

      // also update cache with the computed strict score for consistency on back
      const score = scoreFromArticles(exactArticles);
      chSetCache(cacheKeyFor(ship), score);
    }

    // ---------- 9) Bind search + initial render ----------
    let t;
    search.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => filterShips(search.value), 160);
    });

    renderListView();
    filterShips("");
  })();
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

// ********************************************************************************************
// Initialize Featured Ports: load from featured-ports.html file list of port sections
function initRandomPortsFeature() {
  const container = document.getElementById('random-ports-container');
  if (!container) return;

  console.log('%c[Featured Ports] Loading from featured-ports.html...', 'color: blue; font-weight: bold;');
  
  // Fetch the featured-ports.html file
  fetch('/page-files/featured-ports.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(htmlString => {
      // Parse the HTML string
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      // Get all port sections from the parsed document
      const portSections = doc.querySelectorAll('.port-section');
      
      if (portSections.length === 0) {
        console.log('%c[Featured Ports] No port sections found in featured-ports.html. Falling back to cache/API...', 'color: orange; font-weight: bold;');
        loadRandomPorts();
        return;
      }
      
      console.log(`%c[Featured Ports] Found ${portSections.length} port sections. Selecting 5 random ones.`, 'color: green; font-weight: bold;');
      
      // Convert NodeList to Array for manipulation
      const portSectionsArray = Array.from(portSections);
      
      // Randomly shuffle the array
      const shuffledSections = portSectionsArray.sort(() => 0.5 - Math.random());
      
      // Select up to 5 random port sections
      const sectionsToAdd = shuffledSections.slice(0, 5);
      
      // Clear the container
      container.innerHTML = '';
      
      // Add the selected sections to the container
      sectionsToAdd.forEach(section => {
        // Clone the node to avoid issues with the original document
        const clonedSection = section.cloneNode(true);
        container.appendChild(clonedSection);
      });
      
      // Wire up events and truncate names
      wireUpStaticRandomPortsEvents(container);
      truncatePortNames(3);
    })
    .catch(error => {
      console.error('%c[Featured Ports] Error loading featured-ports.html:', 'color: red; font-weight: bold;', error);
      console.log('%c[Featured Ports] Falling back to cache/API...', 'color: orange; font-weight: bold;');
      loadRandomPorts();
    });
}

// Make static port-name and See more buttons behave like dynamic ones
function wireUpStaticRandomPortsEvents(container) {
  // One listener for both port-name and "See more"
  container.addEventListener('click', (e) => {
    const isSeeMore = e.target.closest('.see-more-btn');
    const isPortName = e.target.closest('.port-name');
    if (isSeeMore || isPortName) {
      const portSection = e.target.closest('.port-section');
      if (!portSection) return;

      const portNameEl = portSection.querySelector('.port-name');
      const query = (portNameEl?.textContent || '').trim();
      if (!query) return;

      scrollToPlaces();
      autoSearch(query);
      return;
    }

    // 📸 If the click was on a place image, open full-size
    const isImage = e.target.classList.contains('place-img');
    if (isImage) {
      const imgSrc = e.target.getAttribute('src');
      if (imgSrc) {
        // Open image in new tab
        window.open(imgSrc, '_blank');
      }
    }
  });
}

function truncatePortNames(wordLimit = 3) {
  // Run only if mobile (≤ 768px width — adjust if needed)
  if (window.innerWidth > 768) return;

  document.querySelectorAll('.port-name').forEach(el => {
    const fullText = el.textContent.trim();
    const words = fullText.split(/\s+/);

    // Always set tooltip with original name
    el.setAttribute('title', fullText);

    if (words.length > wordLimit) {
      el.textContent = words.slice(0, wordLimit).join(' ') + '…';
    }
  });
}

// Featured ports on page load
// Helper function to normalize port names
function normalizePortName(name) {
  return name.trim().toLowerCase();
}

// Helper function to get all cached ports from IndexedDB
async function getAllCachedPorts() {
  const db = await openDB();
  const tx = db.transaction("places", "readonly");
  const store = tx.objectStore("places");
  
  return new Promise((resolve) => {
    const cachedPorts = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cachedPorts.push(cursor.value);
        cursor.continue();
      } else {
        resolve(cachedPorts);
      }
    };
  });
}

// Function to load random ports on page load (fallback if featured-ports.html is empty or missing)
async function loadRandomPorts() {
  try {
    // Container for random ports
    const container = document.getElementById('random-ports-container');
    container.innerHTML = '';
    
    // First, check if we have cached ports
    const cachedPorts = await getAllCachedPorts();
    
    let portsToDisplay = [];
    
    if (cachedPorts.length > 0) {
      // Randomly select up to 5 cached ports
      const shuffled = [...cachedPorts].sort(() => 0.5 - Math.random());
      portsToDisplay = shuffled.slice(0, 5);
      
      // Process each cached port
      for (const portData of portsToDisplay) {
        // Create port section
        const portSection = document.createElement('div');
        portSection.className = 'port-section';
        
        // Create port header
        const portHeader = document.createElement('div');
        portHeader.className = 'port-header';
        
        // Create port name (use originalName if available, otherwise use the key)
        const portName = document.createElement('h3');
        portName.className = 'port-name';
        portName.textContent = portData.originalName || portData.port;
        portName.addEventListener('click', () => {
          // Scroll to top of page
          scrollToPlaces();
          
          // Trigger search using the original name (or the port key if originalName is not available)
          autoSearch(portData.originalName || portData.port);
        });
        
        // Create "See more" button
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.className = 'see-more-btn';
        seeMoreBtn.textContent = 'See more';
        seeMoreBtn.addEventListener('click', () => {
          // Scroll to top of page
          scrollToPlaces();
          
          // Trigger search
          autoSearch(portData.originalName || portData.port);
        });
        
        portHeader.appendChild(portName);
        portHeader.appendChild(seeMoreBtn);
        
        // Create scrollable container for places
        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-scroll-container';
        placesContainer.id = `places-${(portData.originalName || portData.port).replace(/\s+/g, '-')}`;
        
        portSection.appendChild(portHeader);
        portSection.appendChild(placesContainer);
        container.appendChild(portSection);
        
        // Show skeleton cards while loading
        createSkeletonCards(placesContainer, 3);
        
        // Small delay to show skeleton cards, then render actual content
        setTimeout(() => {
          // Render the cached places (limit to 9)
          renderPortPlaces(portData.places.slice(0, 9), placesContainer, portData.lat, portData.lon);
        }, 500);
      }
    } else {
      // If no cached ports, fall back to the original method
      // Fetch ports data
      const response = await fetch('/json/ports.json');
      const regions = await response.json();
      
      // Flatten all ports into a single array
      let allPorts = [];
      regions.forEach(region => {
        allPorts = allPorts.concat(region.ports);
      });
      
      // Select 5 random ports
      const randomPorts = [];
      const portsCopy = [...allPorts];
      
      while (randomPorts.length < 5 && portsCopy.length > 0) {
        const randomIndex = Math.floor(Math.random() * portsCopy.length);
        randomPorts.push(portsCopy[randomIndex]);
        portsCopy.splice(randomIndex, 1); // Remove selected port to avoid duplicates
      }
      
      // Process each random port
      for (const port of randomPorts) {
        // Create port section
        const portSection = document.createElement('div');
        portSection.className = 'port-section';
        
        // Create port header
        const portHeader = document.createElement('div');
        portHeader.className = 'port-header';
        
        // Create port name
        const portName = document.createElement('h3');
        portName.className = 'port-name';
        portName.textContent = port.name;
        portName.addEventListener('click', () => {
          // Scroll to top of page
          scrollToPlaces();
          
          // Trigger search
          autoSearch(port.query);
        });
        
        // Create "See more" button
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.className = 'see-more-btn';
        seeMoreBtn.textContent = 'See more';
        seeMoreBtn.addEventListener('click', () => {
          // Scroll to top of page
          scrollToPlaces();
          
          // Trigger search
          autoSearch(port.query);
        });
        
        portHeader.appendChild(portName);
        portHeader.appendChild(seeMoreBtn);
        
        // Create scrollable container for places
        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-scroll-container';
        placesContainer.id = `places-${port.query.replace(/\s+/g, '-')}`;
        
        portSection.appendChild(portHeader);
        portSection.appendChild(placesContainer);
        container.appendChild(portSection);
        
        // Show skeleton cards while loading
        createSkeletonCards(placesContainer, 3);
        
        // Get coordinates for the port
        try {
          const geoUrl = `https://corsproxy.io/?https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(port.query)}`;
          const geoRes = await fetch(geoUrl);
          const geoData = await geoRes.json();
          
          if (geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            
            // Check cache first using normalized port name
            const db = await openDB();
            const tx = db.transaction("places", "readonly");
            const store = tx.objectStore("places");
            const normalizedPortName = normalizePortName(port.query);
            const cached = await new Promise((res) => {
              const req = store.get(normalizedPortName);
              req.onsuccess = () => res(req.result);
              req.onerror = () => res(null);
            });
            
            const now = Date.now();
            const thirtyDays = 1000 * 60 * 60 * 24 * 30;
            
            if (cached && now - cached.timestamp < thirtyDays) {
              // Use cached data
              renderPortPlaces(cached.places.slice(0, 9), placesContainer, lat, lon);
            } else {
              // Fetch new data
              await loadPortPlaces(lat, lon, port.query, placesContainer);
            }
          } else {
            placesContainer.innerHTML = '<p>Location not found.</p>';
          }
        } catch (err) {
          console.error(`Error loading port ${port.query}:`, err);
          placesContainer.innerHTML = '<p>Error loading places for this port.</p>';
        }
      }
    }
    truncatePortNames(3);
  } catch (err) {
    console.error('Error loading random ports:', err);
    document.getElementById('random-ports-container').innerHTML = '<p>Error loading random ports.</p>';
  }
}

// Helper function to scroll to the places element in user view
function scrollToPlaces() {
  // Add a small delay to ensure the DOM has updated after hiding the featured section
  setTimeout(() => {
    try {
      // Get the places element
      const placesElement = document.getElementById('places');
      
      if (placesElement) {
        // Method 1: Use scrollIntoView with smooth behavior
        placesElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Method 2: Fallback - scroll the main container if it exists
        const mainContainer = document.querySelector('.main');
        if (mainContainer) {
          // Calculate the position of the places element relative to the main container
          const placesPosition = placesElement.getBoundingClientRect().top + mainContainer.scrollTop;
          mainContainer.scrollTo({
            top: placesPosition,
            behavior: 'smooth'
          });
        }
        
        // Method 3: Fallback - scroll the container if it exists
        const container = document.querySelector('.container');
        if (container) {
          // Calculate the position of the places element relative to the container
          const placesPosition = placesElement.getBoundingClientRect().top + container.scrollTop;
          container.scrollTo({
            top: placesPosition,
            behavior: 'smooth'
          });
        }
        
        // Method 4: Fallback - scroll the window
        const placesPosition = placesElement.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: placesPosition,
          behavior: 'smooth'
        });
      } else {
        console.error('Places element not found');
        // Fallback to scrolling to top
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.error('Error scrolling to places element:', err);
      // Fallback to immediate scroll
      const placesElement = document.getElementById('places');
      if (placesElement) {
        placesElement.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, 100); // Small delay to ensure DOM updates are complete
}

// Function to load places for a specific port
async function loadPortPlaces(lat, lon, portName, containerElement) {
  // Show skeleton cards while loading
  createSkeletonCards(containerElement, 3);
  
  const radius = 25000;
  const googleTypes = [
  "restaurant", "tourist_attraction", "shopping_mall", "cafe", "library", "park", "bar"
  ];

  const geoapifyCategories = [
  // Food & drink
  "catering.fast_food",

  // Attractions / leisure
  "tourism","entertainment","adult.nightclub", "leisure",

  // Shopping
  "commercial.supermarket",

  // Emergencies / services
  "healthcare.hospital","healthcare.pharmacy","service.police",
  "service.financial.atm","service.financial.bank","service.financial.money_transfer",

  // Extras you filter for
  "accommodation.hotel"
].join(",");
  
  try {
    const googlePromises = googleTypes.map((type) =>
      fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&key=${googleApiKey}`
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
        const placeId = place.place_id;
        const placeLat = place.geometry.location.lat;
        const placeLon = place.geometry.location.lng;
        const distance = getDistance(lat, lon, placeLat, placeLon);
        const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
        const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));
        let photoRef = null;
        if (place.photos?.length) {
          photoRef = place.photos[0].photo_reference;
        }
        addPlace({
          name: place.name,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          type: googleTypes[i],
          distance,
          walkingTime: walk,
          drivingTime: drive,
          photoRef,
          rating: place.rating || null,
          placeId
        });
      });
    });
    
    geoResults.features?.forEach((place) => {
      const name = place.properties.name;
      if (!name) return;
      const placeLat = place.geometry.coordinates[1];
      const placeLon = place.geometry.coordinates[0];
      const distance = getDistance(lat, lon, placeLat, placeLon);
      const mappedType = mapGeoapifyToGoogleType(place.properties)
      const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
      const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));
      addPlace({
        name,
        lat: placeLat,
        lon: placeLon,
        type: mappedType,
        distance,
        walkingTime: walk,
        drivingTime: drive
      });
    });
    
    // Helper function to count words in a string
    function countWords(str) {
      return str.trim().split(/\s+/).length;
    }
    
    // First filter: places with photos and 2-3 words in name
    let allPlaces = Array.from(placeMap.values())
      .filter(place => 
        place.photoRef && 
        place.name && 
        countWords(place.name) >= 2 && 
        countWords(place.name) <= 3
      )
      .sort((a, b) => a.distance - b.distance);

    // If still not enough, just get any places with photos
    if (allPlaces.length < 5) {
      allPlaces = Array.from(placeMap.values())
        .filter(place => place.photoRef)
        .sort((a, b) => a.distance - b.distance);
    }
    
    // Cache the results with normalized port name
    const db = await openDB();
    const tx = db.transaction("places", "readwrite");
    const store = tx.objectStore("places");
    const normalizedPortName = normalizePortName(portName);
    
    // Check if this port already exists in the database
    const existingData = await new Promise((resolve) => {
      const req = store.get(normalizedPortName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    
    // Only save if it doesn't exist or if it's older than 30 days
    const now = Date.now();
    const thirtyDays = 1000 * 60 * 60 * 24 * 30;
    
    if (!existingData || (now - existingData.timestamp > thirtyDays)) {
      store.put({
        port: normalizedPortName,
        originalName: portName, // Store original name for display
        timestamp: Date.now(),
        lat,
        lon,
        places: allPlaces
      });
    }
    
    // Render the places (limit to 9)
    renderPortPlaces(allPlaces.slice(0, 9), containerElement, lat, lon);
  } catch (err) {
    console.error(err);
    containerElement.innerHTML = "⚠️ Error loading places.";
  }
}

// Function to render places for a port in the horizontal container
function renderPortPlaces(placesArray, containerElement, portLat, portLon) {
  containerElement.innerHTML = '';
  
  // Filter to only include places with photos
  const placesWithPhotos = placesArray.filter(place => place.photoRef);
  
  // If we don't have enough places with photos, show a message
  if (placesWithPhotos.length === 0) {
    containerElement.innerHTML = '<p>No places with photos available for this port.</p>';
    return;
  }
  
  for (let i = 0; i < placesWithPhotos.length; i++) {
    const place = placesWithPhotos[i];
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${portLat},${portLon}&destination=${place.lat},${place.lon}&travelmode=walking`;
    
    // Helper function to count words in a string
    function countWords(str) {
      return str.trim().split(/\s+/).length;
    }
    
    // Truncate long names to 2-3 words with ellipsis
    let displayName = place.name;
    if (countWords(displayName) > 3) {
      const words = displayName.split(/\s+/);
      displayName = words.slice(0, 3).join(' ') + '...';
    }
    
    const tile = document.createElement('div');
    tile.className = 'place';
    tile.setAttribute('data-type', place.type);
    tile.setAttribute('data-placeid', place.placeId || '');
    tile.setAttribute('data-lat', place.lat);
    tile.setAttribute('data-lon', place.lon);
    tile.setAttribute('title', place.name); // Show full name on hover
    
    tile.innerHTML = `
      <strong>${displayName}</strong>
      <div class="category">${place.type.replace(/_/g, " ")}</div>
      <div class="distance">🚶🏻 ${place.walkingTime} walk 🚗 ${place.drivingTime} drive (Our estimation)</div>
      <div class="directions-link">
        <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">
          📍 Get Directions
        </a>
      </div>
      <div class="place-image-container">
        <img class="place-img" loading="lazy" alt="${place.name}" data-photoref="${place.photoRef}">
      </div>
    `;
    
    containerElement.appendChild(tile);
    // After you append each tile in renderPortPlaces:
    const scrollerImg = tile.querySelector('.place-img');
    if (scrollerImg) {
      tile.addEventListener('click', () => {
        if (!scrollerImg.src) {
          const ref = scrollerImg.getAttribute('data-photoref');
          if (ref) {
            scrollerImg.src = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${ref}&key=${googleApiKey}`;
          }
        }
      }, { once: true });
    }
    
    // Add event listener for image click
    const placeImg = tile.querySelector('.place-img');
    if (placeImg) {
      placeImg.addEventListener('click', function() {
        window.open(placeImg.src, '_blank');
      });
    }
  }
}

// Initialize Featured Ports behavior on page load
document.addEventListener('DOMContentLoaded', function () {
  initRandomPortsFeature();
});