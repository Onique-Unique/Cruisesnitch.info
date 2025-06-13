// ALL FUNCTIONS THAT WILL BE ADDED TO THE FINAL DEAL SCRAPER TOOL!!

// FUNCTION 1************************
// Fluctuate Pricing Values on the Deal Scraper tool
(function fluctuateValues() {
  const rows = document.querySelectorAll('#dealTable tbody tr');

  rows.forEach(row => {
    const col8 = row.querySelector('.col-8');
    const col9 = row.querySelector('.col-9');

    if (!col8 || !col9) return;

    const originalPriceText = col8.textContent.trim().replace(/[^0-9.]/g, '');
    const originalPrice = parseFloat(originalPriceText);
    const percentMatch = col9.textContent.trim().match(/\d+/);
    const originalPercent = percentMatch ? parseFloat(percentMatch[0]) : null;

    if (isNaN(originalPrice) || originalPercent === null) return;

    const basePrice = originalPrice / (1 - originalPercent / 100);

    const fluctuate = () => {
      const increase = Math.random() < 0.5;
      const fluctuationPercent = increase
        ? Math.random() * 0.05   // up to 5% increase
        : Math.random() * 0.15;  // up to 15% decrease

      let newPrice = originalPrice * (1 + (increase ? fluctuationPercent : -fluctuationPercent));
      newPrice = Math.max(1, parseFloat(newPrice.toFixed(2)));

      // Visual feedback (optional)
      col8.style.transition = "color 0.4s";
      col8.style.color = increase ? "red" : "green";

      col8.textContent = '$' + newPrice.toLocaleString();

      const newPercent = Math.round(((basePrice - newPrice) / basePrice) * 100);
      col9.textContent = newPercent + '% off';

      const nextInterval = 2000 + Math.random() * 2000;
      setTimeout(fluctuate, nextInterval);
    };

    fluctuate();
  });
})();

// FUNCTION 2*****************
// Adds search functionality to Deal Scraper Tool
(function () {
  const table = document.querySelector('#dealTable');
  if (!table) return console.error("Table with ID 'dealTable' not found.");

  const tbody = table.querySelector('tbody');
  const originalRows = Array.from(tbody.querySelectorAll('tr')); // Save original order

  // Remove existing search/filter UI if already injected
  const existing = document.getElementById('dealSearchInput');
  if (existing) existing.parentElement.remove();

  // Create UI wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'sortSearchTop';
  wrapper.style.textAlign = 'right';
  wrapper.style.marginBottom = '10px';

  // Search input
  const searchInput = document.createElement('input');
  searchInput.id = 'dealSearchInput';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search deals...';
  searchInput.style.padding = '6px';
  searchInput.style.border = '1px solid #ccc';
  searchInput.style.borderRadius = '4px';
  searchInput.style.minWidth = '200px';
  searchInput.style.marginRight = '10px';

  // Sort/filter dropdown
  const sortSelect = document.createElement('select');
  sortSelect.id = 'priceSortSelect';
  sortSelect.style.padding = '6px';
  sortSelect.style.border = '1px solid #ccc';
  sortSelect.style.borderRadius = '4px';
  sortSelect.style.backgroundColor = 'beige';

  // Full options when no tier filter is active
  const fullOptions = [
    { text: 'Sort/ Filter', value: '' },
    { text: 'Price: Low to High', value: 'asc' },
    { text: 'Price: High to Low', value: 'desc' },
    { text: 'Budget Cruises', value: 'budget' },
    { text: 'Classic Cruises', value: 'classic' },
    { text: 'Premium Cruises', value: 'premium' },
  ];

  // Options when a tier filter is active
  const tierFilterOptions = (tier) => [
    { text: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Cruises`, value: tier },
    { text: 'Price: Low to High', value: 'asc' },
    { text: 'Price: High to Low', value: 'desc' },
    { text: 'Sort: All Cruises', value: 'reset' },
  ];

  // Populate select options helper
  function populateSelectOptions(options) {
    sortSelect.innerHTML = '';
    options.forEach(opt => {
      const option = new Option(opt.text, opt.value);
      sortSelect.appendChild(option);
    });
  }

  // Initially load full options
  populateSelectOptions(fullOptions);

  wrapper.appendChild(searchInput);
  wrapper.appendChild(sortSelect);
  table.parentNode.insertBefore(wrapper, table);

  // Helper to get price from a row
  function getPrice(row) {
    return parseFloat(
      (row.querySelector('.col-8')?.textContent || '').replace(/[^\d.]/g, '')
    ) || 0;
  }

  // Current tier filter state
  let currentTierFilter = null;

  // Filter rows based on search input AND tier filter if active
  function filterAndDisplayRows() {
    const query = searchInput.value.toLowerCase().trim();
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.forEach(row => {
      const textCells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.toLowerCase());
      const matchesSearch = query === '' || textCells.some(text => text.includes(query));
      
      // Check tier filter if applied
      let matchesTier = true;
      if (currentTierFilter === 'budget') matchesTier = getPrice(row) <= 999;
      else if (currentTierFilter === 'classic') matchesTier = getPrice(row) >= 1000 && getPrice(row) <= 3500;
      else if (currentTierFilter === 'premium') matchesTier = getPrice(row) >= 3501;

      row.style.display = (matchesSearch && matchesTier) ? '' : 'none';
    });
  }

  // Sort rows by price ascending or descending (only on visible rows)
  function sortVisibleRows(order) {
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.style.display !== 'none');

    rows.sort((a, b) => {
      return order === 'asc' ? getPrice(a) - getPrice(b) : getPrice(b) - getPrice(a);
    });

    rows.forEach(row => tbody.appendChild(row));
  }

  // Reset all filters and sorting
  function resetFilters() {
    currentTierFilter = null;
    tbody.innerHTML = '';
    originalRows.forEach(row => tbody.appendChild(row));
    populateSelectOptions(fullOptions);
    sortSelect.value = '';
    filterAndDisplayRows();
  }

  // Event listeners

  searchInput.addEventListener('input', () => {
    filterAndDisplayRows();
  });

  sortSelect.addEventListener('change', () => {
    const val = sortSelect.value;

    if (val === 'asc' || val === 'desc') {
      // Sort visible rows by price low/high
      sortVisibleRows(val);
    } else if (val === 'budget' || val === 'classic' || val === 'premium') {
      // Apply tier filter and switch dropdown options
      currentTierFilter = val;
      populateSelectOptions(tierFilterOptions(val));
      sortSelect.value = val; // keep tier selected
      filterAndDisplayRows();
    } else if (val === 'reset') {
      resetFilters();
    } else if (val === '') {
      resetFilters();
    }
  });

  console.log('✅ Search, tier filtering, and sort with simplified dropdown options loaded.');
})();

// FUNCTION 3************************
// When User clicks a Table Row on Deal Scraper Tool, will show Weather data of the Departing City
// And Hover changes Background color
(function () {
  const apiKey = 'e7185272b4ce7040e984b18cbe4a713d';

  function cleanCityName(raw) {
    let cleaned = raw.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (cleaned.includes(',')) {
      cleaned = cleaned.split(',')[0].trim();
    }
    return cleaned;
  }

  const popup = document.createElement('div');
  popup.id = 'weather-popup';
  Object.assign(popup.style, {
  display: 'none',
});

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.id = 'weatherCloseBtn';
  closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
  });
  popup.appendChild(closeBtn);

  const contentDiv = document.createElement('div');
  contentDiv.id = 'weather-content';
  popup.appendChild(contentDiv);

  document.body.appendChild(popup);

  function addHoverEffect(row) {
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = '#ffdd1a8f';
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = '';
    });
  }

  async function fetchAndShowWeather(city, dealID, priceText) {
    if (!city) return;

    const cleanCity = cleanCityName(city);
    contentDiv.innerHTML = `<p>Loading...</p>`;
    popup.style.display = 'block';

    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cleanCity)}&appid=${apiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cleanCity)}&appid=${apiKey}&units=metric`)
      ]);
      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();

      if (currentData.cod !== 200 || forecastData.cod !== "200") {
  contentDiv.innerHTML = `
    <h3>Departure Port: ${cleanCity}</h3>
    <p style="color: red; margin-bottom: 10px;">Weather data unavailable for this port.</p>
    <button class='weatherFindDeal' onclick="lockInDeal('${dealID}', this); document.getElementById('weather-popup').style.display='none';"
      onmouseover="this.style.backgroundColor='#ffd700'" 
      onmouseout="this.style.backgroundColor='#5eb8ff'">
      Find a Deal
    </button>
    <p style="margin-top: 6px; font-size: 18px; color: #666;">Sold Price: <strong>${priceText}</strong></p>
    <iframe width="100%" height="200" style="margin-top: 20px; border: none; border-radius: 8px;" loading="lazy" allowfullscreen
    src="https://www.google.com/maps?q=${encodeURIComponent(cleanCity)}&output=embed"></iframe>
  `;
  return;
}

      const temp = Math.round(currentData.main.temp);
      const desc = currentData.weather[0].description;
      const icon = currentData.weather[0].icon;
      const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

      let forecastHtml = '';
      const days = {};
      forecastData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!days[date]) {
          days[date] = item;
        }
      });

      const dates = Object.keys(days).slice(0, 5);
      forecastHtml += `<div style="display: flex; justify-content: space-around; gap: 10px; margin-top: 9px; flex-wrap: wrap; font-size:12px">`;
      dates.forEach(date => {
        const f = days[date];
        const ft = Math.round(f.main.temp);
        const ficon = f.weather[0].icon;
        const fdesc = f.weather[0].description;
        const ficonUrl = `https://openweathermap.org/img/wn/${ficon}.png`;
        forecastHtml += `
          <div style="text-align:center; flex:1;">
            <strong>${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</strong><br>
            <img src="${ficonUrl}" alt="" width="33px" height="33px"><br>
            <span style='font-size: 11px'>${ft}°C</span>
          </div>`;
      });
      forecastHtml += `</div>`;

      contentDiv.innerHTML = `
        <h3>Departure Port: ${cleanCity}</h3>
        <img src="${iconUrl}" alt="${desc}" style="width:55px; height:55px;">
        <p style="font-weight: bold;">${temp}°C</p>
        <p style="text-transform: capitalize;">${desc}</p>
        <button class='weatherFindDeal' onclick="lockInDeal('${dealID}', this); document.getElementById('weather-popup').style.display='none';"
          onmouseover="this.style.backgroundColor='#ffd700'" 
          onmouseout="this.style.backgroundColor='#5eb8ff'">
          Find a Deal
        </button>
        <p id='weatherCurrentPrice'>Sold Price: <strong>${priceText}</strong></p>
        ${forecastHtml}
        <iframe width="100%" height="200" style="margin-top: 20px; border: none; border-radius: 8px;" loading="lazy" allowfullscreen
        src="https://www.google.com/maps?q=${encodeURIComponent(cleanCity)}&output=embed"></iframe>
      `;

    } catch (err) {
      contentDiv.innerHTML = `<p>Error fetching weather data.</p>`;
      console.error('Weather fetch error:', err);
    }
  }

  function initWeatherOnRows() {
    const rows = document.querySelectorAll('#dealTable tbody tr');

    rows.forEach(row => {
      addHoverEffect(row);

      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;

        const departureTd = row.querySelector('.col-3');
        const priceTd = row.querySelector('.col-8');
        const button = row.querySelector('button');
        const dealID = row.dataset.dealid;

        if (!departureTd || !priceTd || !button) return;

        const city = departureTd.textContent.trim();
        const priceText = priceTd.textContent.trim();

        fetchAndShowWeather(city, dealID, priceText);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeatherOnRows);
  } else {
    initWeatherOnRows();
  }
})();

// FUNCTION 4************************** 
// Removes Past due dates of deals (row) if i'm late to updating the table information
(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize to midnight

  // Map short month names to month numbers (0-based)
  const months = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
  };

  function parseDateManual(dateStr) {
    // Examples of dateStr: "Aug 22", "Aug 15 2026"

    const parts = dateStr.split(' ');

    if (parts.length < 2) return null; // not enough data

    let monthStr = parts[0].substring(0,3);
    let dayStr = parts[1].replace(/[^\d]/g, ''); // remove non-digits
    if (!months.hasOwnProperty(monthStr) || !dayStr) return null;

    let month = months[monthStr];
    let day = parseInt(dayStr, 10);
    if (isNaN(day)) return null;

    let year = today.getFullYear();

    if (parts.length === 3) {
      // Try parsing year if given
      let yr = parseInt(parts[2], 10);
      if (!isNaN(yr)) year = yr;
    }

    return new Date(year, month, day);
  }

  const rows = document.querySelectorAll('tr');

  rows.forEach(row => {
    const dateCell = row.querySelector('td.col-2');
    if (!dateCell) return;

    const dateText = dateCell.textContent.trim();
    if (!dateText) return;

    const rowDate = parseDateManual(dateText);
    if (!rowDate) {
      console.log('Failed to parse date:', dateText);
      return;
    }

    rowDate.setHours(0, 0, 0, 0); // normalize

    // DEBUG: Log parsed date vs today
    // console.log('Row date:', rowDate.toDateString(), '| Today:', today.toDateString());

    if (rowDate < today) {
      console.log('Removing row with past date:', dateText);
      row.remove();
    }
  });
})();

