// Packing List Tool Script
// This script powers the interactive packing list feature. It defines the core
// packing essentials, themed lists, and handles adding/removing items,
// persisting state, filtering, and exporting to a printable PDF.
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Define core minimum packing items. Each item must have a unique id
   * (slug) and a human‑readable label. The order of this array reflects
   * priority and will be preserved when rendering available items.
   */
  const coreItems = [
    { id: 'passport', label: 'Passport (valid 6+ months)' },
    { id: 'gov-id', label: 'Government ID (if required)' },
    { id: 'boarding-passes', label: 'Boarding passes / cruise docs' },
    { id: 'luggage-tags', label: 'Luggage tags (printed/attached)' },
    { id: 'primary-credit-card', label: 'Credit card (primary)' },
    { id: 'cash-small-bills', label: 'Cash (small bills for tips)' },
    { id: 'travel-insurance-details', label: 'Travel insurance details' },
    { id: 'essential-prescriptions', label: 'Essential prescriptions (in originals)' },
    { id: 'motion-meds', label: 'Motion-sickness meds (Bonine/patch)' },
    { id: 'daily-vitamins-otc', label: 'Daily vitamins/OTC (pain reliever, antihistamine)' },
    { id: 'prescription-copies', label: 'Prescription copies/doctor note (if needed)' },
    { id: 'phone-charger', label: 'Phone + charging cable' },
    { id: 'power-bank', label: 'Power bank (carry-on)' },
    { id: 'non-surge-power-strip', label: 'Non-surge power strip / USB hub' },
    { id: 'international-adapter', label: 'International/EU plug adapter (if needed)' },
    { id: 'refillable-bottle', label: 'Refillable water bottle' },
    { id: 'reef-safe-sunscreen', label: 'Reef-safe sunscreen (broad spectrum)' },
    { id: 'aloe-gel', label: 'Aloe/after-sun gel' },
    { id: 'lip-balm-spf', label: 'Lip balm with SPF' },
    { id: 'sunglasses', label: 'Sunglasses (polarized if possible)' },
    { id: 'sun-hat', label: 'Sun hat/cap' },
    { id: 'swimwear-2', label: 'Swimwear (2 sets)' },
    { id: 'coverup-rashguard', label: 'Cover-up / rash guard' },
    { id: 'sandals-water-shoes', label: 'Sandals / water shoes' },
    { id: 'lightweight-daypack', label: 'Lightweight daypack / tote' },
    { id: 'dinner-outfit', label: 'Dinner outfit (smart casual)' },
    { id: 'formal-outfit', label: 'Formal/elegant night outfit' },
    { id: 'walking-shoes', label: 'Comfortable walking shoes' },
    { id: 'light-sweater', label: 'Lightweight sweater/hoodie (A/C)' },
    { id: 'rain-jacket', label: 'Packable rain jacket / poncho' },
    { id: 'sleepwear-underwear', label: 'Sleepwear & underwear (trip length)' },
    { id: 'socks', label: 'Socks (trip length + extras)' },
    { id: 'laundry-bag', label: 'Laundry bag / wet-dry bag' },
    { id: 'towel-clips', label: 'Towel clips (for deck chairs)' },
    { id: 'ziploc-bags', label: 'Ziploc bags (phone/keys/beach)' },
    { id: 'reusable-bag', label: 'Reusable shopping bag' },
    { id: 'first-aid-kit', label: 'Small first aid kit (bandages, antiseptic)' },
    { id: 'hand-sanitizer', label: 'Hand sanitizer / antibacterial wipes' },
    { id: 'travel-toiletries', label: 'Travel-size toiletries (TSA compliant)' },
    { id: 'hair-kit', label: 'Hair ties / brush / mini kit' },
    { id: 'makeup-remover', label: 'Makeup & remover pads (if used)' },
    { id: 'razor-kit', label: 'Razor & shaving kit (no loose blades rules)' },
    { id: 'deodorant-perfume', label: 'Deodorant & perfume/cologne (small)' },
    { id: 'lanyard-card-holder', label: 'Lanyard / card holder for cruise card' },
    { id: 'magnet-hooks', label: 'Magnet hooks (metal cabin walls)' },
    { id: 'night-light', label: 'Night light (battery or USB)' },
    { id: 'cpap', label: 'CPAP + distilled water note (if applicable)' },
    { id: 'snorkel-mask-own', label: 'Snorkel mask (if you prefer your own)' },
    { id: 'small-binoculars', label: 'Small binoculars (sightseeing/Alaska)' },
    { id: 'travel-doc-pouch', label: 'Travel documents pouch (organizer)' }
  ];
  /**
   * Additional items used in themed packs that are not part of the core list.
   * Each item is defined here with its label to ensure the search and
   * rendering functions can look them up. These IDs must remain unique.
   */
  const additionalItems = {
    // Beach / Caribbean
    'extra-swimwear': 'Extra swimwear',
    'uv-shirt-rash-guard': 'UV shirt / rash guard',
    'beach-blanket': 'Beach blanket',
    'snorkel-fins': 'Snorkel fins',
    'dry-bag': 'Dry bag',
    'after-bite-stick': 'After-bite stick',
    'reef-safe-sunscreen-high': 'Reef-safe sunscreen (high SPF)',
    'foldable-cooler-bag': 'Foldable cooler bag',
    'mesh-gear-bag': 'Mesh gear bag',
    // Alaska / Cold Weather
    'base-layers': 'Base layers',
    'fleece-mid-layer': 'Fleece mid-layer',
    'waterproof-shell': 'Waterproof shell',
    'wool-socks': 'Wool socks',
    'beanie': 'Beanie/ear warmer',
    'gloves': 'Gloves',
    'hand-warmers': 'Hand warmers',
    'compact-binoculars': 'Compact binoculars',
    'waterproof-daypack': 'Waterproof daypack',
    'lip-balm-spf50': 'Lip balm SPF 50',
    // Mediterranean
    'comfy-city-shoes': 'Comfy city shoes',
    'scarf-pashmina': 'Scarf/pashmina',
    'modest-cover': 'Modest-cover options for churches',
    'plug-adapter-set': 'Plug adapter set',
    'sun-umbrella': 'Sun umbrella',
    'stain-pen': 'Stain pen',
    // Norwegian Fjords / Iceland
    'waterproof-hiking-shoes': 'Waterproof hiking shoes',
    'rain-pants': 'Rain pants',
    'thermal-base-layers': 'Thermal base layers',
    'camera-low-light': 'Camera with low-light capability',
    'motion-wristbands': 'Motion wristbands',
    'compact-thermos': 'Compact thermos',
    // Formal Nights / Celebration
    'dress-shoes': 'Dress shoes',
    'belt-tie-pocket-square': 'Belt/tie/pocket square',
    'jewelry-case': 'Jewelry case',
    'garment-bag': 'Garment bag',
    'wrinkle-release-spray': 'Wrinkle-release spray',
    'fashion-tape': 'Double-sided fashion tape',
    // Snorkel / Water Sports
    'full-face-mask': 'Full-face mask / standard mask',
    'snorkel': 'Snorkel',
    'fins': 'Fins',
    'anti-fog-drops': 'Anti-fog drops',
    'water-shoes': 'Water shoes',
    'rash-guard': 'Rash guard',
    'microfiber-towel': 'Microfiber towel',
    // Excursion / Hiking
    'daypack-chest-strap': 'Daypack with chest strap',
    'trekking-poles': 'Trekking poles (collapsible)',
    'electrolytes': 'Electrolytes',
    'insect-repellent': 'Insect repellent',
    'quick-dry-towel': 'Quick-dry towel',
    'mini-first-aid': 'Mini first aid',
    'blister-care': 'Blister care kit',
    'headlamp': 'Headlamp',
    // Kids & Babies
    'swim-diapers': 'Swim diapers',
    'favorite-snacks': 'Favorite snacks',
    'sippy-cups': 'Sippy cups',
    'stroller': 'Lightweight stroller',
    'baby-carrier': 'Baby carrier',
    'bottle-brush-detergent': 'Bottle brush & detergent tabs',
    'white-noise': 'Nightlight/white-noise',
    'kids-meds-thermometer': 'Kids meds & thermometer',
    // Accessibility / Mobility
    'scooter-charger': 'Scooter charger',
    'extension-cord-note': 'Extension cord request note',
    'foldable-ramp': 'Foldable ramp (if used)',
    'door-magnet-identifiers': 'Door magnet identifiers',
    'extra-battery': 'Extra battery',
    'accessible-excursion-confirmations': 'Accessible excursion confirmations',
    // Dietary / Allergies
    'allergy-cards': 'Allergy dining cards (multilingual)',
    'safe-snacks': 'Safe snacks',
    'epipen': 'Medication EpiPen',
    'sanitizer-wipes': 'Sanitizer wipes',
    'safe-brands-list': 'List of safe brands',
    'collapsible-lunch-container': 'Collapsible lunch container',
    // Gym & Wellness
    'gym-shoes': 'Gym shoes',
    'workout-outfits': 'Workout outfits',
    'resistance-bands': 'Resistance bands',
    'swim-cap-goggles': 'Swim cap/goggles',
    'yoga-strap': 'Yoga strap',
    'protein-bars': 'Protein bars',
    'collapsible-foam-roller': 'Collapsible foam roller (mini)',
    // Photography / Creator
    'camera': 'Camera',
    'spare-batteries': 'Spare batteries',
    'sd-cards': 'SD cards',
    'nd-filter': 'ND filter',
    'mini-tripod': 'Mini tripod',
    'phone-gimbal': 'Phone gimbal',
    'lens-cloth': 'Microfiber lens cloth',
    'waterproof-phone-pouch': 'Waterproof phone pouch',
    // Spa & Relaxation
    'spa-attire': 'Spa day attire',
    'slides': 'Slides',
    'swimsuit-cover': 'Swimsuit cover',
    'hair-wrap': 'Hair wrap',
    'book': 'Book/Kindle',
    'eye-mask': 'Eye mask',
    'ear-plugs': 'Ear plugs',
    'hydrating-face-mask': 'Hydrating face mask',
    // Rainy Season / Hurricane-aware
    'compact-umbrella': 'Compact umbrella',
    'fast-dry-clothes': 'Fast-dry clothes',
    'extra-ziplocs': 'Extra Ziplocs',
    'waterproof-phone-case': 'Waterproof phone case',
    'quick-dry-shoes': 'Quick-dry shoes',
    'desiccant-packets': 'Desiccant packets',
    // Tender Ports
    'waterproof-case': 'Waterproof case',
    'compact-snacks': 'Compact snacks',
    'small-bills': 'Small bills',
    'packable-towel': 'Packable towel',
    'backup-power-bank': 'Backup power bank',
    'printed-meeting-point': 'Printed meeting point',
    // Wedding / Honeymoon
    'ceremony-attire': 'Ceremony attire',
    'ring-case': 'Ring travel case',
    'steamer-alternative': 'Steamer alternative (wrinkle spray)',
    'keepsake-folder': 'Keepsake folder',
    'mini-sewing-kit': 'Mini sewing kit',
    'just-married-magnet': '"Just Married" magnet',
    // Solo Traveler
    'airtag': 'Tile/AirTag tags for bags',
    'doorstop-alarm': 'Doorstop alarm (if allowed)',
    'portable-lockbox': 'Portable lockbox (beach)',
    'contact-card': 'Contact card',
    'backup-cash-stash': 'Backup cash stash',
    // Crew / Back-to-Back
    'extra-meds': 'Extra meds',
    'laundry-sheets': 'Laundry sheets',
    'compact-detergent': 'Compact detergent',
    'storage-cubes': 'Foldable storage cubes',
    'document-copies': 'Document copies',
    'extra-chargers': 'Extra chargers'
  };
  /**
   * Define the themed packs. Each key refers to a theme name and maps to
   * an array of item IDs that belong to that theme. Duplicate IDs
   * appearing in multiple themes are automatically deduplicated when
   * rendering the "All" option.
   */
  const themePacks = {
    beach: [
      'extra-swimwear', 'uv-shirt-rash-guard', 'beach-blanket', 'snorkel-fins', 'dry-bag',
      'after-bite-stick', 'reef-safe-sunscreen-high', 'foldable-cooler-bag', 'mesh-gear-bag'
    ],
    alaska: [
      'base-layers', 'fleece-mid-layer', 'waterproof-shell', 'wool-socks', 'beanie', 'gloves',
      'hand-warmers', 'compact-binoculars', 'waterproof-daypack', 'lip-balm-spf50'
    ],
    mediterranean: [
      'comfy-city-shoes', 'scarf-pashmina', 'modest-cover', 'plug-adapter-set', 'sun-umbrella', 'stain-pen'
    ],
    norwegian: [
      'waterproof-hiking-shoes', 'rain-pants', 'thermal-base-layers', 'camera-low-light',
      'motion-wristbands', 'compact-thermos'
    ],
    formal: [
      'dress-shoes', 'belt-tie-pocket-square', 'jewelry-case', 'garment-bag', 'wrinkle-release-spray', 'fashion-tape'
    ],
    snorkel: [
      'full-face-mask', 'snorkel', 'fins', 'anti-fog-drops', 'reef-safe-sunscreen', 'water-shoes', 'rash-guard', 'microfiber-towel'
    ],
    excursion: [
      'daypack-chest-strap', 'trekking-poles', 'electrolytes', 'insect-repellent',
      'quick-dry-towel', 'mini-first-aid', 'blister-care', 'headlamp'
    ],
    kids: [
      'swim-diapers', 'favorite-snacks', 'sippy-cups', 'stroller', 'baby-carrier',
      'bottle-brush-detergent', 'white-noise', 'kids-meds-thermometer'
    ],
    accessibility: [
      'scooter-charger', 'extension-cord-note', 'foldable-ramp', 'door-magnet-identifiers', 'extra-battery',
      'accessible-excursion-confirmations'
    ],
    dietary: [
      'allergy-cards', 'safe-snacks', 'epipen', 'sanitizer-wipes', 'safe-brands-list', 'collapsible-lunch-container'
    ],
    gym: [
      'gym-shoes', 'workout-outfits', 'resistance-bands', 'swim-cap-goggles', 'yoga-strap', 'protein-bars',
      'electrolytes', 'collapsible-foam-roller'
    ],
    photography: [
      'camera', 'spare-batteries', 'sd-cards', 'nd-filter', 'mini-tripod', 'phone-gimbal', 'lens-cloth', 'waterproof-phone-pouch'
    ],
    spa: [
      'spa-attire', 'slides', 'swimsuit-cover', 'hair-wrap', 'book', 'eye-mask', 'ear-plugs', 'hydrating-face-mask'
    ],
    rain: [
      'compact-umbrella', 'fast-dry-clothes', 'extra-ziplocs', 'waterproof-phone-case', 'quick-dry-shoes', 'desiccant-packets'
    ],
    tender: [
      'waterproof-case', 'dry-bag', 'compact-snacks', 'small-bills', 'packable-towel',
      'backup-power-bank', 'printed-meeting-point'
    ],
    wedding: [
      'ceremony-attire', 'ring-case', 'steamer-alternative', 'keepsake-folder', 'mini-sewing-kit', 'just-married-magnet'
    ],
    solo: [
      'airtag', 'doorstop-alarm', 'portable-lockbox', 'contact-card', 'backup-cash-stash'
    ],
    crew: [
      'extra-meds', 'laundry-sheets', 'compact-detergent', 'storage-cubes', 'document-copies', 'extra-chargers'
    ]
  };
  /**
   * Map theme keys to user‑friendly display names. Used when populating
   * the theme dropdown. If you add new themes to themePacks, also add
   * them here.
   */
  const themeNames = {
    core: 'Core Essentials',
    beach: 'Beach / Caribbean',
    alaska: 'Alaska / Cold Weather',
    mediterranean: 'Mediterranean',
    norwegian: 'Norwegian Fjords / Iceland',
    formal: 'Formal Nights / Celebration',
    snorkel: 'Snorkel / Water Sports',
    excursion: 'Excursion / Hiking',
    kids: 'Kids & Babies',
    accessibility: 'Accessibility / Mobility',
    dietary: 'Dietary / Allergies',
    gym: 'Gym & Wellness',
    photography: 'Photography / Creator',
    spa: 'Spa & Relaxation',
    rain: 'Rainy Season / Hurricane-aware',
    tender: 'Tender Ports',
    wedding: 'Wedding / Honeymoon',
    solo: 'Solo Traveler',
    crew: 'Crew / Back-to-Back',
    all: 'All (Everything)'
  };
  /**
   * Synonyms mapping. Each key corresponds to an item id and maps to an
   * array of alternative terms. These help the search filter find items
   * even if the user types a different word. Only a subset of items
   * require synonyms; others default to matching their label.
   */
  const synonyms = {
    'power-bank': ['portable charger', 'battery pack'],
    'motion-meds': ['sea sickness', 'sea-sickness', 'motion sickness', 'bonine', 'dramamine'],
    'hand-sanitizer': ['antibacterial', 'sanitiser'],
    'night-light': ['nightlight', 'night lamp'],
    'magnet-hooks': ['hooks', 'magnetic hooks'],
    'laundry-bag': ['dirty clothes bag'],
    'ziploc-bags': ['ziplock', 'resealable bags'],
    'sunglasses': ['shades'],
    'rain-jacket': ['poncho', 'raincoat'],
    'refillable-bottle': ['water bottle'],
    'walking-shoes': ['sneakers', 'tennis shoes']
  };
  // Build a dictionary of all items (core + additional) for quick lookup.
  const items = {};
  coreItems.forEach(item => { items[item.id] = { id: item.id, label: item.label }; });
  Object.keys(additionalItems).forEach(id => {
    items[id] = { id, label: additionalItems[id] };
  });
  // Local state: selected item IDs (preserves insertion order), array for custom items.
  let selected = [];
  let customItems = [];
  let currentTheme = 'core';
  // DOM elements
  const themeSelect = document.getElementById('theme-select');
  const searchInput = document.getElementById('packing-search');
  const availableListEl = document.getElementById('available-list');
  const selectedListEl = document.getElementById('selected-list');
  const availableCountEl = document.getElementById('available-count');
  const selectedCountEl = document.getElementById('selected-count');
  const selectAllBtn = document.getElementById('select-all-btn');
  const customInput = document.getElementById('custom-input');
  const customAddBtn = document.getElementById('custom-add-btn');
  const customHint = document.getElementById('custom-hint');
  const listNameInput = document.getElementById('list-name-input');
  /**
   * Populate the theme dropdown with options based on themeNames. The
   * currently selected theme will be restored from localStorage if
   * available.
   */
  function populateThemeSelect() {
    // Remove any existing options
    while (themeSelect.firstChild) themeSelect.removeChild(themeSelect.firstChild);
    // Always include core as first option
    const keys = ['core'].concat(Object.keys(themePacks));
    keys.push('all');
    keys.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = themeNames[key] || key;
      themeSelect.appendChild(opt);
    });
    // Restore saved theme if available
    const savedState = JSON.parse(localStorage.getItem('packingList') || '{}');
    if (savedState.theme && themeNames[savedState.theme]) {
      currentTheme = savedState.theme;
    }
    themeSelect.value = currentTheme;
  }
  /**
   * Retrieve the list of item objects for the currently selected theme. If
   * the theme is "core" then return the core list. If it is "all" then
   * merge all unique items from every theme and the core list in the
   * order they first appear. Otherwise return the specific theme's list.
   */
  function getItemsForCurrentTheme() {
    if (currentTheme === 'core') {
      return coreItems;
    }
    if (currentTheme === 'all') {
      const set = new Set();
      const all = [];
      // Start with core items
      coreItems.forEach(item => {
        if (!set.has(item.id)) {
          set.add(item.id);
          all.push(item);
        }
      });
      // Then each theme in defined order
      Object.keys(themePacks).forEach(theme => {
        themePacks[theme].forEach(id => {
          if (!set.has(id) && items[id]) {
            set.add(id);
            all.push(items[id]);
          }
        });
      });
      return all;
    }
    // Specific theme
    const ids = themePacks[currentTheme] || [];
    return ids.map(id => items[id]).filter(Boolean);
  }
  /**
   * Render the available list of items. Applies the search filter and
   * excludes any already selected item IDs. Updates the available count.
   */
  function renderAvailableList() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const allItems = getItemsForCurrentTheme();
    // Filter out selected
    let toShow = allItems.filter(item => !selected.includes(item.id));
    // Apply search
    if (searchTerm) {
      toShow = toShow.filter(item => {
        const labelMatch = item.label.toLowerCase().includes(searchTerm);
        if (labelMatch) return true;
        const syns = synonyms[item.id] || [];
        return syns.some(s => s.toLowerCase().includes(searchTerm) || searchTerm.includes(s.toLowerCase()));
      });
    }
    availableCountEl.textContent = toShow.length;
    // Clear list
    availableListEl.innerHTML = '';
    // Render
    toShow.forEach(item => {
      const row = document.createElement('div');
      row.className = 'packing-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'avail-' + item.id;
      const labelEl = document.createElement('label');
      labelEl.htmlFor = checkbox.id;
      labelEl.textContent = item.label;
      // Add click handlers
      const add = () => {
        // Small visual tap animation before it moves to 'My list'
        row.classList.add('picked');
        setTimeout(() => {
          if (!selected.includes(item.id)) {
            selected.push(item.id);
            updateSelectedList();
            renderAvailableList();
            saveState();
          }
        }, 160);
      };
      checkbox.addEventListener('change', add);
      row.addEventListener('click', e => {
        // Avoid double toggling when clicking checkbox directly
        if (e.target.tagName.toLowerCase() !== 'input') {
          checkbox.checked = true;
          add();
        }
      });
      row.appendChild(checkbox);
      row.appendChild(labelEl);
      availableListEl.appendChild(row);
    });
  }
  /**
   * Render the selected list as chips with remove buttons. Updates the
   * selected count.
   */
  function updateSelectedList() {
    selectedCountEl.textContent = selected.length;
    selectedListEl.innerHTML = '';
    selected.forEach(id => {
      let label;
      if (items[id]) label = items[id].label;
      else {
        const ci = customItems.find(ci => ci.id === id);
        if (ci) label = ci.label;
      }
      if (!label) return;
      const chip = document.createElement('div');
      chip.className = 'item-chip appear';
      const span = document.createElement('span');
      span.textContent = label;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', 'Remove ' + label);
      removeBtn.addEventListener('click', () => {
        // Smooth dismiss animation
        chip.classList.add('removing');
        setTimeout(() => {
          selected = selected.filter(itemId => itemId !== id);
          // If custom item, remove from customItems array as well
          const idx = customItems.findIndex(ci => ci.id === id);
          if (idx !== -1) customItems.splice(idx, 1);
          updateSelectedList();
          renderAvailableList();
          saveState();
        }, 180);
      });
      chip.appendChild(span);
      chip.appendChild(removeBtn);
      selectedListEl.appendChild(chip);
      // trigger appear transition
      requestAnimationFrame(() => { chip.classList.remove('appear'); });
    });
  }
  /**
   * Save the current selections, custom items and chosen theme to
   * localStorage so that the list persists on reload.
   */
  function saveState() {
    const state = {
      selected,
      custom: customItems,
      theme: currentTheme,
      name: (document.getElementById('list-name-input')?.value || '').trim()
    };
    localStorage.setItem('packingList', JSON.stringify(state));
  }
  /**
   * Restore selections, custom items and theme from localStorage. If
   * nothing is saved, initializes with defaults.
   */
  function restoreState() {
    const savedState = JSON.parse(localStorage.getItem('packingList') || '{}');
    if (savedState.selected) selected = savedState.selected;
    if (savedState.custom) customItems = savedState.custom;
    if (savedState.theme && themeNames[savedState.theme]) {
      currentTheme = savedState.theme;
    }
    if (savedState.name && listNameInput) {
      listNameInput.value = savedState.name;
    }
  }
  
  /**
   * Add a custom item to the packing list.
   */
  function addCustomItem() {
    const raw = customInput.value.trim();
    if (!raw) return;
    // Normalize label and generate slug-like id
    const baseId = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = 'custom-' + baseId;
    // Check duplicates
    const existsInSelected = selected.includes(id);
    const existsInCustom = customItems.some(ci => ci.id === id);
    if (existsInSelected || existsInCustom) {
      customHint.textContent = 'Already added';
      setTimeout(() => { customHint.textContent = ''; }, 2000);
      customInput.value = '';
      return;
    }
    // Add to custom
    customItems.push({ id, label: raw });
    selected.push(id);
    customInput.value = '';
    updateSelectedList();
    renderAvailableList();
    saveState();
  }
  /**
   * Generate a printable PDF using the browser's print dialog. Opens a
   * new window, writes a simple HTML document with the selected items
   * and triggers the print UI. This provides a high quality PDF via
   * the user's built‑in print capabilities.
   */
  function exportToPDF() {
    // Branded, print-friendly layout with uniform checkbox boxes and uppercase items
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Unable to open print window. Please allow pop-ups for this site.');
      return;
    }
    const nameVal = (document.getElementById('list-name-input')?.value || '').trim();
    const title = nameVal ? nameVal.toUpperCase() : 'CRUISE PACKING & CHECK-LIST';
    const itemsToPrint = [];
    selected.forEach(id => {
      let label = items[id]?.label;
      if (!label) {
        const ci = customItems.find(ci => ci.id === id);
        if (ci) label = ci.label;
      }
      if (label) itemsToPrint.push(label.toUpperCase());
    });
    const doc = printWindow.document;
    doc.open();
    doc.write('<html><head><title>CRUISESNITCH.INFO</title>');
    doc.write('<style>' +
      '@page { size: letter; margin: 18mm; } ' +
      'body{font-family: Segoe UI, Arial, sans-serif; color:#111;}' +
      '.brand{display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;}' +
      '.brand .site{font-weight:800; letter-spacing:0.5px; font-size:12px; opacity:.85;}' +
      'h1{font-size:20px; letter-spacing:0.8px; margin:6px 0 10px; text-transform:uppercase;}' +
      'p.lead{margin:0 0 14px; color:#444; font-size:12px;}' +
      '.grid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px 18px;}' +
      '@media print { .grid{grid-template-columns:repeat(3,1fr);} }' +
      '.row{display:flex; align-items:flex-start; gap:10px; break-inside:avoid;}' +
      '.box{width:14px; height:14px; border:2px solid #111; flex:0 0 auto; margin-top:2px;}' +
      '.label{font-size:12px; line-height:1.25;}' +
      '.footer{margin-top:14px; font-size:11px; color:#444; display:flex; justify-content:space-between; align-items:center;}' +
      '.water{font-weight:800; letter-spacing:1px; opacity:.08; font-size:42px; position:fixed; bottom:55mm; left:-55mm; transform:rotate(-90deg);}' +
    '</style>');
    doc.write('</head><body>');
    // doc.write('<div class="brand"><div class="site">CRUISESNITCH.INFO</div><div class="site">2025</div></div>');
    doc.write('<h1>' + title + '</h1>');
    doc.write('<p class="lead">Check items as you pack. (Tip: Share or print this checklist.)</p>');
    if (itemsToPrint.length === 0) {
      doc.write('<p class="lead">No items selected yet.</p>');
    } else {
      doc.write('<div class="grid">');
      itemsToPrint.forEach(txt => {
        doc.write('<div class="row"><div class="box"></div><div class="label">' + txt + '</div></div>');
      });
      doc.write('</div>');
    }
    doc.write('<div class="footer"><span>* Use CruiseSnitch.info Free Cruise Port Navigator to plan your shore days.</span><span>Happy Sailing! ⛵</span></div>');
    doc.write('<div class="water">CRUISESNITCH.INFO</div>');
    doc.write('</body></html>');
    doc.close();
    // Focus and auto-trigger print dialog for convenience
    printWindow.focus();
    printWindow.print();
  }

  // Modal open/close logic is handled in index.html inline or other script, but ensure
  // we close the modal by ESC key for accessibility
  const modalEl = document.getElementById('packing-modal');
  const openBtn = document.getElementById('open-packing-btn');
  const closeBtn = document.getElementById('packing-close');
  // Open packing list when the button is clicked
  openBtn.addEventListener('click', () => {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
    // Reset search field and render lists fresh
    searchInput.value = '';
    renderAvailableList();
    updateSelectedList();
    // Focus the search input for quick typing
    searchInput.focus();
  });
  // Close packing list when the close button is clicked
  closeBtn.addEventListener('click', () => {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  });
  // Clicking outside the dialog closes the modal
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      closeBtn.click();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl.classList.contains('open')) {
      document.getElementById('packing-close').click();
    }
  });
  
  // Initialize the app
  populateThemeSelect();
  restoreState();
  renderAvailableList();
  updateSelectedList();
  
  // Event listeners
  themeSelect.addEventListener('change', (e) => {
    currentTheme = e.target.value;
    saveState();
    renderAvailableList();
  });
  
  searchInput.addEventListener('input', renderAvailableList);
  
  selectAllBtn.addEventListener('click', () => {
    const allItems = getItemsForCurrentTheme();
    allItems.forEach(item => {
      if (!selected.includes(item.id)) {
        selected.push(item.id);
      }
    });
    updateSelectedList();
    renderAvailableList();
    saveState();
  });
  
  customAddBtn.addEventListener('click', addCustomItem);
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCustomItem();
  });
  
  listNameInput.addEventListener('input', saveState);
  
  // Export to PDF button
  const exportBtn = document.getElementById('export-pdf-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToPDF);
  }

  document.getElementById('clear-list-btn')?.addEventListener('click', () => {
    selected = [];
    customItems = [];
    updateSelectedList();
    renderAvailableList();
    saveState();
  });
});