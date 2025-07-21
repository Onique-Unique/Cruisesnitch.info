// Copy Html Page after Vacationstogo scraped & 
// remove duplicate table rows that are too similar
// Bookmarklet
javascript:(function () {
  // Create the copy button
  const btn = document.createElement('button');
  btn.innerText = '📄';
  btn.id = 'copy-html-button';
// Style the button
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#007BFF',
    color: '#fff',
    fontSize: '24px',
    border: 'none',
    cursor: 'pointer',
    zIndex: 9999,
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  });
// Append button to the page
  document.body.appendChild(btn);
// Function to remove duplicate rows
  function removeDuplicateRows() {
    const seen = new Set();
    const rows = document.querySelectorAll('#dealTable tbody tr');

    rows.forEach(row => {
      const cols = row.querySelectorAll('td');
      if (cols.length < 6) return;

      const keyParts = [
        cols[1]?.textContent.trim(), // nights
        cols[2]?.textContent.trim(), // departure
        cols[3]?.textContent.trim(), // end
        cols[4]?.textContent.trim(), // departure port
        cols[5]?.textContent.trim()  // cruise line/ship
      ];

      const key = keyParts.join('|').replace(/\s+/g, '');

      if (seen.has(key)) {
        row.remove();
      } else {
        seen.add(key);
      }
    });
  }

  function updateMetaDates(doc) {
    const today = new Date().toISOString().split('T')[0];
    const metaPub = doc.querySelector('meta[property="article:published_time"]');
    const metaMod = doc.querySelector('meta[property="article:modified_time"]');
    if (metaPub) metaPub.setAttribute('content', today);
    if (metaMod) metaMod.setAttribute('content', today);
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.innerHTML);
        if (data.datePublished || data.dateModified || data["@graph"]) {
          if (data["@graph"]) {
            data["@graph"].forEach(node => {
              if (node.datePublished) node.datePublished = today;
              if (node.dateModified) node.dateModified = today;
            });
          }
          if (data.datePublished) data.datePublished = today;
          if (data.dateModified) data.dateModified = today;
          script.innerHTML = JSON.stringify(data, null, 2);
        }
      } catch (e) {
        console.warn('Invalid JSON-LD:', e);
      }
    });
  }
 
  function swapAnchorsToParagraphsInCol0() {
  document.querySelectorAll('td.col-0').forEach(td => {
    const a = td.querySelector('a');
    if (a) {
      const p = document.createElement('p');
      p.className = 'col-0';
      p.textContent = a.textContent;
      td.innerHTML = '';
      td.appendChild(p);
    }
  });
}

  // Run duplicate remover immediately
  removeDuplicateRows();

  // swap the fast deal anchor tags to p elements to not have broken links
  swapAnchorsToParagraphsInCol0();

// Copy HTML content when button is clicked
  btn.addEventListener('click', () => {
    const clone = document.documentElement.cloneNode(true);
    const cloneBtn = clone.querySelector('#copy-html-button');
    if (cloneBtn) cloneBtn.remove();
    updateMetaDates(clone);
    const doctype = "<!DOCTYPE html>\n";
    const html = doctype + clone.outerHTML;

    navigator.clipboard.writeText(html)
      .then(() => {
        btn.innerText = '✅';
        setTimeout(() => btn.innerText = '📄', 2000);
      })
      .catch(err => {
        btn.innerText = '❌';
        console.error('Failed to copy:', err);
      });
  });
})();