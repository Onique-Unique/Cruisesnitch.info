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
          color: white;
        }
        .popup-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  padding: 10px; /* adds space on small screens */
  box-sizing: border-box;
}

.sleek-popup {
  background: #e6f4ff; /* soft light blue */
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  height: 90vh;
  max-height: 600px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sleek-popup iframe {
  flex-grow: 1;
  border: none;
  width: 100%;
  height: 100%;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #004b8d;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
}
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
<img src="/images/gifs/deals-header-banner.gif" alt="Cruise Deals Banner" style="width: 100%; max-height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
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
            <th>New Price</th>
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
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.innerHTML = \`
      <div class="popup sleek-popup">
      <button class="close-btn" onclick="this.closest('.popup-overlay').remove()">×</button>
      <iframe 
        src="https://qfreeaccountssjc1.az1.qualtrics.com/jfe/form/SV_4N6aWU5R28a3RSm" 
        frameborder="0" allowfullscreen>
      </iframe>
    </div>
    \`;
    document.body.appendChild(overlay);
  }
</script>
<script src="/functions.js"></script>
    </body>
    </html>
  `);
  newWin.document.close();
})();