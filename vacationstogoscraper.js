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
    <!DOCTYPE html>
<html lang="en">
  <head>
      <title>Low Cruise Deals</title>
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@graph": [{
                "@type": "WebSite",
                "@id": "https://cruisesnitch.info#website",
                "url": "https://cruisesnitch.info/",
                "name": "Cruise Snitch",
                "description": "It's time for you to upgrade and abandon the limited view of the cruise world. Hi, fellow Cruise travelers - This Website covers everything you should know for your very best experience on cruise ships, from the eyes of an experienced Crewmember! ",
                "potentialAction": [{
                    "@type": "SearchAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": "https://cruisesnitch.info?s={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                }],
                "inLanguage": "en-US"
            }],
            "@type": "NewsArticle",
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://cruisesnitch.info/"
            },
            "url": "https://cruisesnitch.info/",
            "headline": "Low Cruise Deals",
            "description": "It's time for you to upgrade and abandon the limited view of the cruise world. Hi, fellow Cruise travelers - This Website covers everything you should know for your very best experience on cruise ships, from the eyes of an experienced Crewmember! ",
            "speakable": {
                "@type": "SpeakableSpecification",
                "xpath": ["/html/head/title", "/html/head/meta[@name='description']/@content"]
            },
            "datePublished": "2025-02-19",
            "dateModified": "2025-03-10",
            "author": [{
                "@type": "Person",
                "name": "Onique Campbell",
                "url": "https://cruisesnitch.info/"
            }],
            "publisher": {
                "@type": "Organization",
                "name": "Cruise Snitch",
                "sameAs": ["https://www.facebook.com/Cruisesnitch", "https://twitter.com/Cruisesnitch"],
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://cruisesnitch.info/images/blog-images/cruise-ft-img.jpg",
                    "width": 600,
                    "height": 60
                }
            },
            "image": [{
                    "@type": "ImageObject",
                    "url": "https://cruisesnitch.info/images/blog-images/cruise-ft-img.jpg",
                    "width": 1400,
                    "height": 1400
                },
                {
                    "@type": "ImageObject",
                    "url": "https://cruisesnitch.info/images/blog-images/cruise-ft-img.jpg",
                    "width": 1400,
                    "height": 1050
                },
                {
                    "@type": "ImageObject",
                    "url": "https://cruisesnitch.info/images/blog-images/cruise-ft-img.jpg",
                    "width": 1400,
                    "height": 788
                }
            ],
            "thumbnailUrl": "https://cruisesnitch.info/images/blog-images/cruise-ft-img.jpg"
        }
    </script>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
    <meta property="article:published_time" content="2025-02-19">
    <meta property="article:modified_time" content="2025-02-19">
    <meta name="theme-color" content="#151515">
    <meta name="twitter:card" content="Low Cruise Deals">
    <meta name="twitter:site" content="@cruisesnitch">
    <meta name="twitter:creator" content="@cruisesnitch">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta property="og:site_name" content="Low Cruise Deals">
    <meta property="og:url" content="https://cruisesnitch.info/">
    <meta name="og:title" property="og:title" content="Low Cruise Deals">
    <meta property="og:description" content="It's time for you to upgrade and abandon the limited view of the cruise world. Hi, fellow Cruise travelers - This Website covers everything you should know for your very best experience on cruise ships, from the eyes of an experienced Crewmember! ">
    <meta itemprop="url" content="https://cruisesnitch.info/">
    <meta itemprop="name" content="Low Cruise Deals">
    <meta itemprop="description" content="It's time for you to upgrade and abandon the limited view of the cruise world. Hi, fellow Cruise travelers - This Website covers everything you should know for your very best experience on cruise ships, from the eyes of an experienced Crewmember! ">
    <meta name="description" content="It's time for you to upgrade and abandon the limited view of the cruise world. Hi, fellow Cruise travelers - This Website covers everything you should know for your very best experience on cruise ships, from the eyes of an experienced Crewmember! ">
    <link rel="canonical" href="https://cruisesnitch.info/">
    <link rel="alternate" title="Cruise Snitch » Feed" type="application/rss+xml" href="https://cruisesnitch.info/feed">
    <!-- favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon_io/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_io/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon_io/favicon-16x16.png">
    <link rel="manifest" href="/images/favicon_io/site.webmanifest">
    <!-- Preconnects -->
    <!-- OpenWeather APIs and icons -->
    <link rel="preconnect" href="https://api.openweathermap.org">
    <link rel="preconnect" href="https://openweathermap.org">
    <!-- Google Maps -->
    <link rel="preconnect" href="https://www.google.com">
    <!-- Qualtrics Form (loads iframe or tracking scripts) -->
    <link rel="preconnect" href="https://qfreeaccountssjc1.az1.qualtrics.com">
    <!-- Prefetch Link -->
    <link rel="dns-prefetch" href="//qfreeaccountssjc1.az1.qualtrics.com">
    <link rel="dns-prefetch" href="//api.openweathermap.org">
    <link rel="dns-prefetch" href="//openweathermap.org">
    <link rel="dns-prefetch" href="//www.google.com">
    <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
    <link rel="preconnect" href="https://tpc.googlesyndication.com" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="preconnect" href="https://www.googletagmanager.com">
    <link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer" onload="this.onload=null;this.rel='stylesheet'" />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <!-- Banner -->
<img class="bannerImg"src="/images/gifs/deals-header-banner.gif" alt="Cruise Deals Banner">
      <p id="headline-top">Cruiselines are lowering prices to fill up their ships fast - Find the best last-minute discounts & booking rates from every major cruise line in the world — many offers are booked within hours.</p>
      <ul id="headline-list">
        <li><strong>Search Deals:</strong> Use the search bar below to quickly find cruise deals by ship name, departure port, destination etc.</li>
        <li><strong>Sort / Filter:</strong> Click "Sort / Filter" to sort deals low to high, high to low, or to browse by budget, classic, or premium cruise categories.</li>
        <li>
          <strong>Find A Deal/ Lower Rate:</strong> Fill out the box field 
          <a onclick="lockInDeal('12345', this);">Find Lower Rates/ Find A Deal</a> 
          to receive the best sourced discounts, deals & coupons.
        </li>
        <li><strong>Date:</strong> Shows the sail date of the cruise (Dates shown without the year is for the current year).</li>
        <li><strong>Departure/ End:</strong> Displays the departure & return port.</li>
        <li><strong>Cruise Line / Ship:</strong> Lists the cruise line and ship name.</li>
        <li><strong>Original Price:</strong> The brochure advertised price before any price drops, discount or deals discovered.</li>
        <li><strong>Sold Prices:</strong> Tracked discounted prices paid & booked for this exact cruise itinerary.</li>
      </ul>
      <div class="table-container">
      <table id="dealTable">
        <thead>
          <tr>
            <th></th>
            <th>Date</th>
            <th>Departure</th>
            <th>End</th>
            <th>Cruise Line / Ship</th>
            <th>Original Price</th>
            <th>Sold Prices</th>
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
                <td><button id='findLowerRateBtn'; onclick="lockInDeal('${dealID}', this)">Find a Lower Rate</button></td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
      </div>

       <script>
  function lockInDeal(dealID, button) {
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.innerHTML = \`
      <div class="popup sleek-popup">
      <button class="close-btn" onclick="this.closest('.popup-overlay').remove()">×</button>
      <iframe 
        src="https://tally.so/r/mZX56V" 
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