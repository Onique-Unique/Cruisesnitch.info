// Scrapes from admin product "listing page" and converts into Json file for website
// Paste code inside console, copy results and paste to products.json

(() => {
  const products = [];
  const keywords = ['cruise', 'cruising', 'ship'];

  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const titleElement = card.querySelector('h2.card-title');
    const imageElement = card.querySelector('img.wt-image');
    const cardIdMatch = card.innerHTML.match(/listing-actions-(\d+)/);

    if (!titleElement || !imageElement || !cardIdMatch) return;

    const rawTitle = titleElement.textContent.trim();
    const titleLower = rawTitle.toLowerCase();

    // ✅ Filter only cruise-related products
    if (!keywords.some(kw => titleLower.includes(kw))) return;

    const shortTitle = rawTitle.split(' ').slice(0, 5).join(' '); // ✅ Limit to first 5 words

    const listingId = cardIdMatch[1];
    const linkContainer = document.querySelector(`#listing-actions-${listingId}`);
    const viewLink = linkContainer?.querySelector('a[href*="etsy.com/listing"]');

    if (!viewLink) return;

    let link = viewLink.href;

    // ✅ Modify link to use fromtheship.etsy.com and remove tracking suffix
    link = link.replace('https://www.etsy.com', 'https://fromtheship.etsy.com');
    link = link.replace(/\?ref=.*$/, '');

    const product = {
      title: shortTitle,
      image: imageElement.src,
      link: link,
      buttonText: "View on Etsy"
    };

    products.push(product);
  });

  console.log(JSON.stringify(products, null, 2));
})();
