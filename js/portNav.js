//   ********************************************
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");

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
  sidebarDynamic.innerHTML = `<h4>Saved Day Plans</h4>`;
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
        if (portData && portData.savedAt && (now - portData.savedAt > expirationMs)) {
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

// Determine whether to show the human‑verification modal
async function isHumanVerificationNeeded(portName) {
  const verifiedAt = parseInt(localStorage.getItem('humanVerified') || '0', 10);
  const recentlyVerified = Date.now() - verifiedAt < 8 * 60 * 60 * 1000;
  // Normalize the port name because the cache key is stored in lowercase
  const normalized = normalizePortName(portName);
  const cached = await isPortCached(normalized);
  return !recentlyVerified && !cached;
}

function showHumanVerification(onSuccess) {
  const overlay = document.createElement('div');
  overlay.style = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                  'background:rgba(0,0,0,0.5);display:flex;' +
                  'align-items:center;justify-content:center;z-index:9999;';
  const modal = document.createElement('div');
  modal.style = 'background:#fff;padding:1rem 1.5rem;border-radius:8px;max-width:350px;' +
                'text-align:center;font-family:inherit;';
  const heading = document.createElement('h3');
  heading.textContent = 'Human verification';
  modal.appendChild(heading);

  // Choose a random challenge type
  const type = Math.floor(Math.random() * 5); // 0–4

  function complete() {
    localStorage.setItem('humanVerified', Date.now().toString());
    document.body.removeChild(overlay);
    onSuccess();
  }

  if (type === 0) {
    // Hold-to-verify
    modal.insertAdjacentHTML('beforeend', '<p>Press and hold the button to verify you are human.</p>');
    const btn = document.createElement('button');
    const duration = 1000 + Math.random() * 1000; // between 1 and 2 seconds
    let timer;
    btn.textContent = 'Hold me';
    btn.onmousedown = () => {
      timer = setTimeout(() => {
        complete();
      }, duration);
    };
    btn.onmouseup = btn.onmouseleave = () => clearTimeout(timer);
    modal.appendChild(btn);
  } else if (type === 1) {
    // Math challenge
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    modal.insertAdjacentHTML('beforeend', `<p>What is ${a} + ${b}?</p>`);
    const input = document.createElement('input');
    input.type = 'number';
    input.style = 'margin-right:0.5rem;';
    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.onclick = () => {
      if (parseInt(input.value, 10) === a + b) {
        complete();
      } else {
        alert('Incorrect, try again.');
      }
    };
    modal.appendChild(input);
    modal.appendChild(submit);
  } else if (type === 2) {
    // Type word backwards
    const words = ['ocean','ship','port','cabin','anchor','island'];
    const word = words[Math.floor(Math.random() * words.length)];
    modal.insertAdjacentHTML('beforeend', `<p>Type the word <strong>${word}</strong> backwards:</p>`);
    const input = document.createElement('input');
    input.type = 'text';
    input.style = 'margin-right:0.5rem;';
    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.onclick = () => {
      if (input.value.toLowerCase() === word.split('').reverse().join('')) {
        complete();
      } else {
        alert('Incorrect, try again.');
      }
    };
    modal.appendChild(input);
    modal.appendChild(submit);
  } else if (type === 3) {
    // Click the correct color
    const colors = ['red','blue','green','yellow'];
    const target = colors[Math.floor(Math.random() * colors.length)];
    modal.insertAdjacentHTML('beforeend', `<p>Click on the <strong>${target}</strong> circle to continue.</p>`);
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;';
    colors.sort(() => Math.random() - 0.5).forEach(color => {
      const circle = document.createElement('div');
      circle.style = `width:40px;height:40px;border-radius:50%;background:${color};cursor:pointer;`;
      circle.onclick = () => {
        if (color === target) {
          complete();
        } else {
          alert('Wrong color, try again.');
        }
      };
      row.appendChild(circle);
    });
    modal.appendChild(row);
  } else {
    // Order the numbers
    modal.insertAdjacentHTML('beforeend', `<p>Click the numbers in ascending order:</p>`);
    const numbers = [1,2,3,4];
    numbers.sort(() => Math.random() - 0.5);
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;';
    let nextExpected = 1;
    numbers.forEach(n => {
      const button = document.createElement('button');
      button.textContent = n;
      button.style = 'width:40px;height:40px;font-size:1.1rem;';
      button.onclick = () => {
        if (n === nextExpected) {
          button.disabled = true;
          nextExpected++;
          if (nextExpected > 4) {
            complete();
          }
        } else {
          alert('Incorrect order, try again.');
        }
      };
      row.appendChild(button);
    });
    modal.appendChild(row);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

async function searchCity() {
  // Get the current port name from the input box and ensure it's a string
  const portName = document.getElementById('cityInput').value.trim();
  if (!portName) {
    alert("Enter a city name");
    return;
  }

  // If verification is required for this port, show the modal and re-run search afterwards.
  if (await isHumanVerificationNeeded(portName)) {
    showHumanVerification(searchCity);
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
  document.getElementById("places").innerHTML = "🔍 Searching...";

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
        const placeId = place.place_id;
        const placeLat = place.geometry.location.lat;
        const placeLon = place.geometry.location.lng;
        const distance = getDistance(lat, lon, placeLat, placeLon);
        const walk = formatDuration(Math.round((distance / 2) * 60 + Math.random() * 5));
        const drive = formatDuration(Math.round((distance / 10) * 60 + Math.random() * 5));

        let photoUrl = null;
        if (place.photos?.length) {
          const photoRef = place.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${googleApiKey}`;
        }

        const rating = place.rating || null;
        const review = place.reviews?.find(r => r.rating >= 4.5)?.text || null;

        addPlace({
          name: place.name,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          type: googleTypes[i],
          distance,
          walkingTime: walk,
          drivingTime: drive,
          photoUrl,
          rating: place.rating || null,
          placeId // store it so you can use it later to fetch reviews
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
  let output = `<div id="places">
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
     output += `<div class="place${extraClass}" data-type="${place.type}" data-placeid="${place.placeId || ''}" data-lat="${place.lat}" data-lon="${place.lon}">
    <strong>
  ${isCruisersLoved ? '🌟 <span style="color:#d35400;">Cruisers Also Loved…</span><br>' : ''}
  ${place.name}
</strong>
    <div class="category">${place.type.replace(/_/g, " ")}</div>
    <div class="distance">🚶🏻 ${place.walkingTime} walk 🚗 ${place.drivingTime} drive (Our estimation)</div>
    <div class="directions-link">
      <a href="${directionsUrl}" target="_blank" style="color:#007BFF;text-decoration:underline;">
        📍 Get Directions
      </a>
    </div>
    
    ${place.photoUrl ? `
      <div class="place-image-container" style="display:none;">
        <img src="${place.photoUrl}" class="place-img" loading="lazy" alt="${place.name}">
      </div>
      <button class="view-more-btn" style="margin-top:5px;">View More</button>
    ` : ''}

    ${place.rating && place.review ? `
      <div class="place-review" style="margin-top:10px; font-size:0.9em; background:#f9f9f9; padding:8px; border-left:3px solid #ffc107;">
        <p style="display:flex;">⭐ <strong>${place.rating}</strong></p> — <em>"${place.review}"</em>
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
    let reviewDiv = card.querySelector(".place-review");
    const placeId = card.getAttribute("data-placeid");

    // SHOW case
    if (imgContainer && imgContainer.style.display === "none") {
      const isMobile = window.innerWidth <= 768;
      imgContainer.style.display = isMobile ? "flex" : "block";
      this.textContent = "Hide More";

      // If no review yet, fetch and inject
      if (!reviewDiv && placeId) {
        const review = await fetchHighRatedReview(placeId);
        if (review) {
          reviewDiv = document.createElement("div");
          reviewDiv.className = "place-review";
          reviewDiv.innerHTML = `<p style="display:flex;">⭐ <strong>${review.rating}</strong></p> — <em>"${review.text}"</em>`;
          card.appendChild(reviewDiv);
        }
      } else if (reviewDiv) {
        reviewDiv.style.display = "block";
      }

      // Enable zoom click on image (once)
      const img = imgContainer.querySelector("img");
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

async function fetchHighRatedReview(placeId) {
  const proxy = "https://corsproxy.io/?";
  const url = `${proxy}https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,reviews&key=${googleApiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const highRated = data.result?.reviews?.find(r => r.rating >= 4.5);
    return highRated || null;
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
      { name: "Cruise Port Advisor", url: "https://cruiseportadvisor.com/feed/" }
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