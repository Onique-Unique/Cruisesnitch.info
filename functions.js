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

  // Remove existing search bar if any
  const existing = document.getElementById('dealSearchInput');
  if (existing) existing.parentElement.remove();

  // Create search input wrapper and input
  const searchWrapper = document.createElement('div');
  searchWrapper.style.textAlign = 'right';
  searchWrapper.style.marginBottom = '10px';

  const searchInput = document.createElement('input');
  searchInput.id = 'dealSearchInput';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search deals...';
  searchInput.style.padding = '6px';
  searchInput.style.border = '1px solid #ccc';
  searchInput.style.borderRadius = '4px';
  searchInput.style.minWidth = '200px';

  searchWrapper.appendChild(searchInput);
  table.parentNode.insertBefore(searchWrapper, table);

  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    const rows = table.querySelectorAll('tbody tr');

    let matchedCount = 0;
    rows.forEach((row) => {
      const tds = row.querySelectorAll('td');
      const tdTexts = Array.from(tds).map(td => td.textContent.trim().toLowerCase());

      const rowMatches = tdTexts.some(text => text.includes(query));

      if (rowMatches || query === '') {
        row.style.display = '';
        if (rowMatches) matchedCount++;
      } else {
        row.style.display = 'none';
      }
    });

    console.log(`Matched rows: ${matchedCount}`);
  });

  console.log('✅ Search bar added. Start typing to test.');
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
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  padding: '30px 20px 20px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '90vh', // ADDED
  overflowY: 'auto', // ADDED: Enables scroll if needed
  zIndex: 10000,
  display: 'none',
  fontFamily: 'Segoe UI, sans-serif',
  color: '#333',
  textAlign: 'center',
  boxSizing: 'border-box'
});


  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#d0eaff',
    color: '#000',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
  });
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
    <h3 style="margin: 0 0 10px;">Departure Port: ${cleanCity}</h3>
    <p style="color: red; margin-bottom: 10px;">Weather data unavailable for this port.</p>
    <button onclick="lockInDeal('${dealID}', this); document.getElementById('weather-popup').style.display='none';"
      style="margin-top: 10px; padding: 10px 20px; background-color: #007BFF; color: #fff; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; transition: background 0.3s ease;"
      onmouseover="this.style.backgroundColor='#ffd700'" 
      onmouseout="this.style.backgroundColor='#007BFF'">
      Find a Deal
    </button>
    <p style="margin-top: 6px; font-size: 14px; color: #666;">Current Price: <strong>${priceText}</strong></p>
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
      forecastHtml += `<div style="display: flex; justify-content: space-around; gap: 10px; margin-top: 16px; flex-wrap: wrap;">`;
      dates.forEach(date => {
        const f = days[date];
        const ft = Math.round(f.main.temp);
        const ficon = f.weather[0].icon;
        const fdesc = f.weather[0].description;
        const ficonUrl = `https://openweathermap.org/img/wn/${ficon}.png`;
        forecastHtml += `
          <div style="text-align:center; min-width: 80px;">
            <strong>${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</strong><br>
            <img src="${ficonUrl}" alt="" width="40" height="40"><br>
            <span>${ft}°C</span>
          </div>`;
      });
      forecastHtml += `</div>`;

      contentDiv.innerHTML = `
        <h3 style="margin: 0 0 10px;">Departure Port: ${cleanCity}</h3>
        <img src="${iconUrl}" alt="${desc}" style="width:80px; height:80px;">
        <p style="margin: 8px 0; font-size: 18px; font-weight: bold;">${temp}°C</p>
        <p style="margin: 0; text-transform: capitalize;">${desc}</p>
        <button onclick="lockInDeal('${dealID}', this); document.getElementById('weather-popup').style.display='none';"
          style="margin-top: 20px; padding: 10px 20px; background-color: #007BFF; color: #fff; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; transition: background 0.3s ease;"
          onmouseover="this.style.backgroundColor='#ffd700'" 
          onmouseout="this.style.backgroundColor='#007BFF'">
          Find a Deal
        </button>
        <p style="margin-top: 6px; font-size: 14px; color: #666;">Current Price: <strong>${priceText}</strong></p>
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
