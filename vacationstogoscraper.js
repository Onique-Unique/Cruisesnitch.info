(function () {
  const deals = [];

  document.querySelectorAll("table.ticker.deals tbody tr").forEach((row) => {
    const tds = row.querySelectorAll("td");
    if (tds.length >= 10) {
      const first10 = [];
      for (let i = 0; i < 10; i++) {
        if (i === 0) {
          first10.push(tds[i].innerHTML); // Preserve anchor
        } else {
          first10.push(tds[i].textContent.trim());
        }
      }
      deals.push(first10);
    }
  });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  shuffleArray(deals);

  const newWin = window.open("", "_blank");
  newWin.document.write(`
    <html>
    <head>
      <title>Scraped Cruise Deals</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #e0f2ff; /* light blue background */
          padding: 30px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 20px;
        }
        th, td {
          padding: 2.5px;
          text-align: left;
          font-size: small;
        }
        button {
          padding: 6px 12px;
          background: #007BFF;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background: #0056b3;
        }
        .popup-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.6); display: flex;
          align-items: center; justify-content: center; z-index: 9999;
        }
        .popup {
          background: white; padding: 20px; border-radius: 10px; width: 350px;
        }
        .popup h3 { margin-top: 0; font-size: 18px; }
        .popup ul { padding-left: 20px; }
        .popup button { margin-right: 10px; }
        .col-0, .col-6 { display: none; }
        .col-8 {color: #1eb71e; }
        .col-2, .col-5 { background-color: #00000087; color: white; }
        .col-9 { background-color: #ffff003d; }
        .col-1, .col-3, .col-4, .col-6, .col-7 { background-color: #f0f8ffab}
        .col-3, .col-4 {color: #007BFF}
        #dealTable tbody tr:nth-child(odd) {
          background-color: #f0f8ff;
        }
        #dealTable tbody tr:nth-child(even) {
          background-color: #f9fcff;
        }
        #dealTable tbody tr:nth-child(odd) .col-1,
        #dealTable tbody tr:nth-child(odd) .col-3,
        #dealTable tbody tr:nth-child(odd) .col-4,
        #dealTable tbody tr:nth-child(odd) .col-6,
        #dealTable tbody tr:nth-child(odd) .col-7 {
          background-color: rgba(240, 248, 255, 0.7);
        }
        #dealTable tbody tr:nth-child(even) .col-1,
        #dealTable tbody tr:nth-child(even) .col-3,
        #dealTable tbody tr:nth-child(even) .col-4,
        #dealTable tbody tr:nth-child(even) .col-6,
        #dealTable tbody tr:nth-child(even) .col-7 {
          background-color: rgba(255, 255, 255, 0.9);
        }
      </style>
    </head>
    <body>
      <!-- Banner -->
<img src="https://i.etsystatic.com/41264143/r/isbl/c7859b/68231744/isbl_3360x840.68231744_f6tkwgew.jpg" alt="Cruise Deals Banner" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
      <!-- <h1>Scraped Cruise Deals</h1> -->
      <table id="dealTable">
        <thead>
          <tr>
            <th></th>
            <th>Date</th>
            <th>Departure</th>
            <th>End</th>
            <th>Cruise Line / Ship</th>
            <th>Original Price</th>
            <th>Booked Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${deals.map((deal) => {
            const dealID = (deal[0].match(/#(\\d+)/) || [])[1] || "Unknown";
            return `
              <tr data-dealid="${dealID}" data-info='${JSON.stringify(deal)}'>
                ${deal.map((td, idx) => {
                  if (idx === 1) {
                    return `<td class="col-${idx}">${td} night/s</td>`;
                  } else if (idx === 9) {
                    const percent = parseFloat(td.replace('%', ''));
                    const display = isNaN(percent) || percent <= 0 ? td : td + ' off';
                    return `<td class="col-${idx}">${display}</td>`;
                  } else {
                    return `<td class="col-${idx}">${td}</td>`;
                  }
                }).join("")}
                <td><button onclick="lockInDeal('${dealID}', this)">Find a Lower Rate</button></td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>

      <script>
        function lockInDeal(dealID, button) {
          const row = button.closest('tr');
          const data = JSON.parse(row.getAttribute('data-info'));

          let message = '<strong>YOU CAN REQUEST A LOWER RATE USING OUR TRAVEL ADVISOR</strong><br><br>';
          message += 'You are interested in:<br><ul>';

          data.forEach((val, idx) => {
            if (idx === 0 || idx === 6 || idx === 7) return;
            if (idx === 4 && val === data[3]) return;
            if (idx === 1) val += ' night/s';
            if (idx === 9) {
              const pct = parseFloat(val.replace('%', ''));
              if (!isNaN(pct) && pct > 0) val += ' off';
            }
            message += '<li>' + val + '</li>';
          });
          message += '</ul>';

          message += '<p>Our travel advisors use techniques such as:</p><ul>' +
                     '<li>Group rate booking strategies</li>' +
                     '<li>Price matching and alerts</li>' +
                     '<li>Using loyalty points and programs</li>' +
                     '<li>Timing promotions and flash sales</li>' +
                     '</ul>';

          const overlay = document.createElement("div");
          overlay.className = "popup-overlay";
          overlay.innerHTML = \`
            <div class="popup">
              <h3>Deal #\${dealID}</h3>
              <div>\${message}</div>
              <br>
              <button onclick="this.closest('.popup-overlay').remove()">Close</button>
              <button onclick="alert('Redirecting to advisor...')">Continue</button>
            </div>
          \`;
          document.body.appendChild(overlay);
        }
      </script>
      <script>
  const container = newWin.document.getElementById('carouselTrack')?.parentElement;
  let isDown = false;
  let startX;
  let scrollLeft;

  container?.addEventListener('mousedown', (e) => {
    isDown = true;
    container.classList.add('active');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container?.addEventListener('mouseleave', () => {
    isDown = false;
    container.classList.remove('active');
  });

  container?.addEventListener('mouseup', () => {
    isDown = false;
    container.classList.remove('active');
  });

  container?.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed
    container.scrollLeft = scrollLeft - walk;
  });
</script>

    </body>
    </html>
  `);
  newWin.document.close();
})();