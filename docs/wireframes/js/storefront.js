/* Storefront PWA: the shopper-facing store, drawn with the shared default kit. Sample vendor: Aquaverde Sanitary.
   Every screen renders for phone (390 px) and desktop (1200 px); .m-only / .d-only parts switch with the device toggle. */
(function () {
  'use strict';
  const { icon, btn, ibtn, pill, ph, field, tog, chk, radio, chip, sw, tabs, table, card, zone, tag, pin, pcard, lines } = WF;
  const P = WF.products;
  const go = WF.go;

  WF.surface('st', {
    label: 'Storefront PWA',
    about: 'What shoppers see on each vendor’s own domain, drawn with the shared default kit. Each vendor gets its own look in code over these same pages. Switch Mobile and Desktop above.',
  });

  const crumbs = (items) =>
    `<nav class="crumb" aria-label="Breadcrumb">${items.map(([t, g], i, a) => (i < a.length - 1 ? `<span${go(g)}>${t}</span>${icon('chev', 11)}` : `<span class="muted">${t}</span>`)).join('')}</nav>`;
  const stepper = (n = 1) => `<span class="row nw" style="border:1px solid var(--wire);border-radius:6px;gap:0">${btn('', { icon: 'minus', ghost: true, sm: true, label: 'Less' })}<b style="min-width:28px;text-align:center">${n}</b>${btn('', { icon: 'plus', ghost: true, sm: true, label: 'More' })}</span>`;
  const H = (t, sub = '', right = '') => `<div class="h-sec"><div><h3>${t}</h3>${sub ? `<span class="small muted">${sub}</span>` : ''}</div>${right}</div>`;

  /* Matt black versions shown on the filtered listing */
  const black = [
    { title: 'Aria single-lever basin mixer', model: 'AV-BM-1120-MB', price: '5,190', mrp: '6,900', off: 25, sw: ['black', 'chrome', 'gold'], badge: 'Bestseller', rating: [4.6, 38] },
    { title: 'Aria tall basin mixer', model: 'AV-BM-1125-MB', price: '6,990', mrp: '8,900', off: 21, sw: ['black', 'chrome', 'gold'], rating: [4.7, 15] },
    { title: 'Linea single-lever basin mixer', model: 'AV-BM-1140-MB', price: '4,290', mrp: '5,590', off: 23, sw: ['black', 'chrome'], rating: [4.2, 9] },
    { title: 'Aria compact basin mixer', model: 'AV-BM-1118-MB', price: '4,590', mrp: '5,990', off: 23, sw: ['black', 'chrome'] },
    { title: 'Aria sensor basin mixer', model: 'AV-BM-1150-MB', enquire: true, sw: ['black', 'chrome'], badge: 'Projects' },
    { title: 'Aria wall-mounted mixer', model: 'AV-WM-1130-MB', price: '6,240', mrp: '7,990', off: 22, sw: ['black', 'chrome'], rating: [4.5, 6] },
  ];

  /* ---------------- Browse ---------------- */
  WF.screen({
    id: 'st-home', surface: 'st', group: 'Browse', title: 'Home',
    purpose: 'The vendor’s front door: hero, benefits, categories, best sellers, the brand story and a way to find a dealer, all arranged by the vendor from CMS blocks.',
    route: '/', who: 'Shoppers', data: ['pages (home)', 'navigation', 'site-settings', 'products', 'schemes', 'reviews', 'contact-preferences'], docs: ['docs/10-storefront-and-vendor-ui.md', 'docs/13-pwa-seo-performance.md'],
    notes: [
      'Everything between header and footer is a CMS block the vendor arranges in Pages, Home. This drawing uses the shared default kit; a vendor’s own UI restyles the same blocks.',
      'The benefits strip is editable text and icons. Typical lines for this industry: free delivery, warranty, ISI mark, cash on delivery.',
      'Carousels pull from a category, a hand-picked list or “featured” products. Prices always include GST.',
      'The dealer finder block takes a pincode and opens the dealer locator. Shown only with the dealer-locator feature.',
      'On phones the store offers to install itself as an app after a little browsing. iPhones get “Share, then Add to Home Screen” instead.',
      'The offer strip block shows the live scheme: its rule in plain words and its real end time. The countdown runs to the scheme’s end and nowhere else; with no live scheme the block hides itself. Needs the schemes feature.',
      'The reviews block shows real published reviews with “Verified purchase”, never typed testimonials, and the average comes from the same reviews. Needs the reviews feature.',
      'The offers sign-up asks for an email or WhatsApp number with one unticked box per channel. It never pre-ticks, and order updates are never mixed in. Needs the offer-messages feature.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Home',
      body: `
        <section class="col" style="gap:8px">
          ${ph('', { h: dev === 'm' ? 430 : 440, inner: `<span class="mono xs" style="position:absolute;top:8px;left:8px;background:var(--paper);padding:1px 6px;border-radius:3px">Hero slide 1 of 3 · ${dev === 'm' ? 'phone image 780 × 1000' : 'desktop image 1920 × 800'}</span>
            <div style="position:absolute;left:${dev === 'm' ? 14 : 40}px;right:${dev === 'm' ? 14 : 'auto'}px;bottom:${dev === 'm' ? 14 : 40}px;max-width:440px;background:var(--paper);padding:${dev === 'm' ? 14 : 20}px;border-radius:6px;display:flex;flex-direction:column;gap:8px">
              <h2 style="font-size:${dev === 'm' ? 22 : 30}px;line-height:1.15">Bathrooms that last a lifetime ${pin(1)}</h2><p class="muted">Solid brass faucets with a 5-year warranty</p>${btn('Shop basin mixers', { pri: true, lg: true, go: 'st-category' })}</div>` })}
          <div class="row" style="justify-content:center;gap:6px"><span class="swt sw-black" style="width:8px;height:8px"></span><span class="swt sw-white" style="width:8px;height:8px"></span><span class="swt sw-white" style="width:8px;height:8px"></span></div>
        </section>
        ${zone(`<section class="card" style="border:1.5px solid var(--ink)"${go('st-offers')}><div class="cb" style="flex-direction:${dev === 'm' ? 'column' : 'row'};align-items:${dev === 'm' ? 'stretch' : 'center'};gap:10px">${icon('tag', 18)}<div class="sp"><b>Rainline shower launch: ₹2,290 instead of ₹2,690 ${pin(6)}</b><div class="xs muted">MRP ₹3,500 · 200 mm overhead shower in chrome and matt black · offer ends Sat, 31 Oct, 11:59 pm</div></div><span class="mono small nowrap">28 days 13 h left</span>${btn('Shop the launch', { sm: true, pri: true, go: 'st-offers' })}</div></section>`, { flag: 'schemes' })}
        <section class="g c4 m2" style="gap:10px">${[['truck', 'Free delivery above ₹999'], ['shield', '5-year warranty on faucets'], ['check', 'ISI-marked sanitaryware'], ['card', 'Cash on delivery']]
          .map(([ic, t], i) => `<div class="row nw small" style="border:1px solid var(--fill-2);border-radius:8px;padding:10px">${icon(ic, 18)}<span>${t}</span>${i === 0 ? pin(2) : ''}</div>`).join('')}</section>
        <section class="col">${H('Shop by category')}
          <div class="g c6 m3">${['Basin mixers', 'Showers', 'Wall-hung WCs', 'Wash basins', 'Kitchen mixers', 'Accessories'].map((t) => `<div class="col" style="gap:6px;text-align:center"${go('st-category')}>${ph('', { ar: '1/1' })}<span class="small b6">${t}</span></div>`).join('')}</div></section>
        <section class="col">${H(`Bestsellers ${pin(3)}`, '', btn('View all', { ghost: true, sm: true, after: 'chev', go: 'st-category' }))}
          <div class="hs">${[P[0], P[1], P[2], P[6]].map((p) => pcard(p)).join('')}</div></section>
        <section class="split">${ph('Matt black range', { ar: dev === 'm' ? '4/3' : '16/10' })}
          <div class="col" style="justify-content:center;gap:10px"><span class="sec-t">New range</span><h3 style="font-size:${dev === 'm' ? 20 : 26}px">The matt black range</h3><p class="muted">Mixers, showers and accessories in a finish that hides water spots.</p><div>${btn('Explore the range', { go: 'st-category' })}</div></div></section>
        <section class="split" style="align-items:center"><div class="col"><span class="sec-t">Our story</span><h3 style="font-size:${dev === 'm' ? 20 : 26}px">Made in Morbi since 1991</h3><p class="muted">Family-run, with our own foundry and ceramic plant.</p>
          <div class="g c3" style="gap:8px">${[['35', 'years'], ['1,200', 'dealers'], ['180', 'cities']].map(([n, l]) => `<div><b style="font-size:24px">${n}</b><div class="small muted">${l}</div></div>`).join('')}</div></div>${ph('Factory photo', { ar: '16/10' })}</section>
        ${zone(`<section class="card"><div class="cb" style="padding:${dev === 'm' ? 16 : 24}px;gap:10px"><h3 style="font-size:20px">See it before you buy ${pin(4)}</h3><p class="muted small">Visit one of 1,200 dealers and experience centres.</p><div class="row nw">${field('', '', { ph: 'Your pincode', cls: 'sp' })}${btn('Find a dealer', { pri: true, go: 'st-dealers' })}</div></div></section>`, { flag: 'dealer-locator' })}
        ${zone(`<section class="col">${H(`What buyers say ${pin(7)}`, '4.6 average from 412 verified reviews')}
          <div class="g c3 m1">${[['“The matt black mixer still looks new after a year of hard water.”', 'Meera, Ahmedabad', '5', 'Aria basin mixer'], ['“Delivered in 4 days with a proper GST invoice for our builder.”', 'Sanjay, Nashik', '5', 'Nimbus wall-hung WC'], ['“Good flow, but the wall bracket needed longer screws.”', 'Arvind, Pune', '4', 'Rainline overhead shower']]
            .map(([q, n, r, p]) => `<figure class="card" style="margin:0"><div class="cb">${WF.stars(r + '.0')}<p class="small">${q}</p><span class="xs muted">${n} · Verified purchase · ${p}</span></div></figure>`).join('')}</div></section>`, { flag: 'reviews' })}
        ${zone(`<section class="card"><div class="cb" style="padding:${dev === 'm' ? 16 : 24}px;gap:10px"><h3 style="font-size:20px">Get our offers first ${pin(8)}</h3><p class="muted small">Festival offers and new launches from Aquaverde. At most 2 messages a week.</p>
          <div class="row nw">${field('', '', { ph: 'Email or WhatsApp number', cls: 'sp' })}${btn('Sign up', { pri: true })}</div>
          <div class="row">${chk(false, 'By email')}${zone(chk(false, 'On WhatsApp'), { flag: 'whatsapp-offers' })}</div><span class="xs muted">Unsubscribe in one tap from any message. Order updates are separate.</span></div></section>`, { flag: 'offer-messages' })}
        <section class="col">${H('Questions')}<div class="accordion">${['Do you deliver to my pincode?', 'Is cash on delivery available?', 'How do I claim warranty?', 'Do you install the products?'].map((q) => `<div><span>${q}</span>${icon('plus', 14)}</div>`).join('')}</div></section>
        <section class="card m-only" style="border:1.5px solid var(--ink)"><div class="cb" style="gap:10px"><div class="row nw">${ph('', { w: 48, h: 48 })}<div class="sp"><b>Install Aquaverde on your phone ${pin(5)}</b><div class="xs muted">Opens like an app and loads faster.</div></div></div><div class="row">${btn('Install', { pri: true, go: 'st-offline' })}${btn('Not now', { ghost: true })}</div></div></section>`,
    }),
  });

  const filterSidebar = () => `
    <div class="col" style="gap:0">
      <div class="row" style="justify-content:space-between;padding-bottom:8px"><b>Filters ${pin(1)}</b><span class="small muted">Clear all</span></div>
      <div class="fgroup"><h5>Finish ${icon('chevd', 12)}</h5>${[['black', 'Matt black', 14, 1], ['chrome', 'Chrome', 38], ['gold', 'Brushed gold', 8], ['gun', 'Gun metal', 4]].map(([k, l, n, on]) => `<div class="row nw small">${chk(!!on)}${sw(k)}<span class="sp">${l}</span><span class="faint xs">${n}</span></div>`).join('')}</div>
      <div class="fgroup"><h5>Price ${icon('chevd', 12)}</h5><div class="row nw">${field('', '₹1,000', { cls: 'sp' })}<span class="faint">to</span>${field('', '₹12,000', { cls: 'sp' })}</div><div style="height:4px;background:var(--ink-3);border-radius:2px;margin:6px 4px"></div></div>
      <div class="fgroup"><h5>Mounting ${icon('chevd', 12)}</h5>${[['Deck mounted', 52, 1], ['Wall mounted', 12]].map(([l, n, on]) => `<div class="row nw small">${chk(!!on)}<span class="sp">${l}</span><span class="faint xs">${n}</span></div>`).join('')}</div>
      <div class="fgroup"><h5>Cartridge ${icon('chevd', 12)}</h5>${[['35 mm', 40], ['40 mm', 24]].map(([l, n]) => `<div class="row nw small">${chk(false)}<span class="sp">${l}</span><span class="faint xs">${n}</span></div>`).join('')}</div>
      <div class="fgroup"><h5>Flow rate ${icon('chevd', 12)}</h5>${[['Up to 6 litres a minute', 30], ['Above 6 litres a minute', 34]].map(([l, n]) => `<div class="row nw small">${chk(false)}<span class="sp">${l}</span><span class="faint xs">${n}</span></div>`).join('')}</div>
      <div class="fgroup"><h5>Rating ${icon('chevd', 12)}</h5>${[['4 stars and above', 48], ['3 stars and above', 57]].map(([l, n]) => `<div class="row nw small">${chk(false)}<span class="sp">${l}</span><span class="faint xs">${n}</span></div>`).join('')}</div>
      <div class="fgroup">${tog(false, 'In stock only')}</div>
      <div class="fgroup">${tog(false, 'On offer')}</div>
    </div>`;

  WF.screen({
    id: 'st-category', surface: 'st', group: 'Browse', title: 'Category listing',
    purpose: 'Products in one category with filters that match the industry: finish, mounting and flow for faucets; size and fabric for clothing; door thickness for locks.',
    route: '/c/faucets/basin-mixers?finish=matt-black&mounting=deck', who: 'Shoppers', data: ['products', 'variants', 'categories', 'attribute-sets'], docs: ['docs/12-catalog-and-import.md', 'docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Filters are built from the category’s attribute set, so each industry gets the right filters with counts and no vendor-specific code.',
      'Chosen filters live in the web address, so a shared link or the back button keeps them.',
      'Prices include GST, with the MRP struck through and the discount shown, as Indian shoppers expect.',
      '“Price on request” cards lead to a quote form instead of the cart.',
      '“Load more” keeps the list fast on phones; numbered page links stay in the page for search engines.',
      'Cards carry a heart (wishlist, saved on the device until the shopper signs in) and the star rating from published reviews. Products covered by a live scheme show its badge and the scheme price, worked out on the server. The “Rating” and “On offer” filters appear only when reviews and schemes are on.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Shop',
      body: `
        ${crumbs([['Home', 'st-home'], ['Faucets', 'st-category'], ['Basin mixers']])}
        ${H('Basin mixers', '64 products · prices include GST', `<span class="d-only">${field('', 'Sort: Popular', { sel: true })}</span>`)}
        <div class="side">
          <aside class="d-only">${filterSidebar()}</aside>
          <div class="col" style="gap:14px">
            <div class="row m-only" style="position:sticky;top:60px;z-index:4;background:var(--paper);padding:6px 0">${btn('Filter (2)', { icon: 'filter', go: 'st-filters', cls: 'sp' })}${btn('Sort: Popular', { icon: 'sort', cls: 'sp' })}</div>
            <div class="row">${chip('Matt black', { x: true, on: true })}${chip('Deck mounted', { x: true, on: true })}<span class="small muted">14 results ${pin(2)}</span><span class="sp"></span><span class="mono xs faint d-only">?finish=matt-black&amp;mounting=deck</span>${pin(6)}</div>
            <div class="g c3 m2">${black.map((p, i) => pcard(p, { cta: dev === 'd' && i < 3 })).join('')}</div>
            <div class="row small muted">Prices include GST ${pin(3)} · Price on request leads to a quote form ${pin(4)}</div>
            <div class="col" style="align-items:center;gap:6px"><span class="small muted">Showing 6 of 14</span>${btn('Load more', {})}${pin(5)}</div>
          </div>
        </div>`,
    }),
  });

  WF.screen({
    id: 'st-filters', surface: 'st', group: 'Browse', title: 'Filter sheet', fixed: true,
    purpose: 'On phones, filters open in a bottom sheet over the list; on desktop the same choices open in a side panel.',
    route: '/c/faucets/basin-mixers (filters open)', who: 'Shoppers', data: ['attribute-sets', 'products (counts)'], docs: ['docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Counts update as options are ticked, so shoppers never land on an empty list.',
      'The button states how many products will show and applies the filters in one tap.',
      'Groups sit on the left and options on the right, all within reach of a thumb.',
    ],
    render: ({ dev }) => {
      const bg = WF.store({ tab: 'Shop', body: `${crumbs([['Home', 'st-home'], ['Faucets', 'st-category'], ['Basin mixers']])}${H('Basin mixers', '64 products')}<div class="g c3 m2">${black.slice(0, 4).map((p) => pcard(p, { go: '' })).join('')}</div>` });
      const groups = [['Finish', 1], ['Price', 0], ['Mounting', 1], ['Cartridge', 0], ['Flow rate', 0], ['Rating', 0], ['Stock and offers', 0]];
      const panel = `
        <div class="row" style="padding:14px 16px;border-bottom:1px solid var(--wire)"><b style="font-size:16px">Filters</b>${pin(3)}<span class="sp"></span><span class="small muted">Clear all</span>${ibtn('x', 'Close', { go: 'st-category' })}</div>
        <div class="g" style="grid-template-columns:${dev === 'm' ? '120px' : '150px'} minmax(0,1fr);flex:1;min-height:0;gap:0">
          <div class="col" style="gap:0;background:var(--fill);border-right:1px solid var(--wire)">${groups.map(([g, n], i) => `<div class="row nw small" style="padding:12px;${i === 0 ? 'background:var(--paper);font-weight:600' : ''}"><span class="sp">${g}</span>${n ? `<span class="pl">${n}</span>` : ''}</div>`).join('')}</div>
          <div class="col" style="padding:12px 16px;gap:12px">${[['black', 'Matt black', 14, 1], ['chrome', 'Chrome', 38], ['gold', 'Brushed gold', 8], ['gun', 'Gun metal', 4]].map(([k, l, n, on], i) => `<div class="row nw">${chk(!!on)}${sw(k)}<span class="sp">${l}</span><span class="faint xs">${n}${i === 0 ? pin(1) : ''}</span></div>`).join('')}</div>
        </div>
        <div class="row nw" style="padding:12px 16px;border-top:1px solid var(--wire)">${btn('Clear', { lg: true })}${btn('Show 14 products', { pri: true, lg: true, cls: 'sp', go: 'st-category' })}${pin(2)}</div>`;
      return `<div style="position:relative;height:100%;overflow:hidden">${bg}<div class="overlay">${dev === 'm' ? `<div class="sheet-up" style="height:72%"><div style="width:40px;height:4px;border-radius:2px;background:var(--fill-2);margin:8px auto 0"></div>${panel}</div>` : `<div class="drawer-r">${panel}</div>`}</div></div>`;
    },
  });

  WF.screen({
    id: 'st-search', surface: 'st', group: 'Browse', title: 'Search', fixed: true,
    purpose: 'Instant search that understands model numbers, the way dealers, plumbers and repeat buyers actually search.',
    route: '/search?q=1120', who: 'Shoppers', data: ['products', 'variants', 'categories'], docs: ['docs/12-catalog-and-import.md'],
    notes: [
      'Model numbers and SKUs match first, even when typed partly, like “1120”.',
      'Small typos still find results (“basin mixr”). Recent searches stay on the device.',
      'Enter opens the full results page, which uses the same layout and filters as a category.',
    ],
    render: ({ dev }) => {
      const results = `
        <div class="col" style="gap:4px"><span class="sec-t">Products ${pin(1)}</span>
          ${[['Aria single-lever basin mixer', 'AV-BM-<b>1120</b>', '₹4,250'], ['Aria tall basin mixer', 'AV-BM-1125 · same series', '₹6,150'], ['35 mm cartridge for Aria', 'AV-SP-0035 · fits <b>1120</b>', '₹690']]
            .map(([t, m, p]) => `<div class="row nw" style="padding:8px 0;border-bottom:1px solid var(--fill-2)"${go('st-product')}>${ph('', { w: 44, h: 44 })}<div class="sp"><div class="small b6">${t}</div><div class="mn">${m}</div></div><b class="small">${p}</b></div>`).join('')}</div>
        <div class="col" style="gap:6px"><span class="sec-t">Categories</span><div class="row">${chip('Basin mixers', { go: 'st-category' })}${chip('Spare parts')}</div></div>
        <div class="row small" style="padding:8px 0"${go('st-category')}>${icon('search', 14)}<span>See all results for “1120”</span>${icon('chev', 12)}${pin(3)}</div>
        <div class="col" style="gap:6px"><span class="sec-t">Recent searches ${pin(2)}</span><div class="row">${chip('matt black shower')}${chip('wall hung wc')}${chip('basin mixr')}</div></div>`;
      if (dev === 'm') {
        return `<div class="sf" style="height:100%"><div class="row nw" style="padding:10px 12px;border-bottom:1px solid var(--wire)">${ibtn('back', 'Back', { go: 'st-home' })}${field('', '1120', { cls: 'sp', focus: true, icon: 'search' })}${ibtn('x', 'Clear')}</div><div class="col" style="padding:14px;gap:16px">${results}</div></div>`;
      }
      const bg = WF.store({ tab: 'Home', body: `${ph('Hero', { h: 360 })}<div class="g c4">${P.slice(0, 4).map((p) => pcard(p, { go: '' })).join('')}</div>` });
      return `<div style="position:relative;height:100%;overflow:hidden">${bg}<div class="overlay" style="background:rgba(18,22,28,.3);align-items:flex-start;justify-content:center"><div class="card" style="margin-top:62px;width:560px;box-shadow:0 12px 40px var(--shadow)"><div class="cb" style="gap:14px">${field('', '1120', { focus: true, icon: 'search' })}${results}</div></div></div></div>`;
    },
  });

  /* ---------------- Product ---------------- */
  WF.screen({
    id: 'st-product', surface: 'st', group: 'Product', title: 'Product page',
    purpose: 'Everything a buyer of fittings needs to decide: finish and price, delivery date and COD for their pincode, full specifications, manuals, drawings and installation video.',
    route: '/products/aria-single-lever-basin-mixer?finish=matt-black', who: 'Shoppers', data: ['products', 'variants', 'product-documents', 'shipping-zones', 'reviews', 'schemes', 'coupons', 'wishlists'], docs: ['docs/10-storefront-and-vendor-ui.md', 'docs/12-catalog-and-import.md', 'docs/13-pwa-seo-performance.md', 'docs/11-orders-payments-gst.md'],
    notes: [
      'The price comes from the server and includes GST. MRP and discount are shown next to it.',
      'Each finish is a variant. Picking one changes the photos, model number, price and stock, and updates the web address.',
      'The pincode check asks Shiprocket (when connected) and the vendor’s shipping zones: a pincode is deliverable, and cash on delivery possible, only when both say yes. The delivery fee always comes from the zones.',
      'Quote and WhatsApp buttons send the product with the message. For enquire-only products the quote button replaces Add to cart.',
      'Specifications come grouped from the attribute set, so they match the CMS exactly.',
      'Manuals and spec sheets are public. In Phase 2 a document can be limited to signed-in trade partners.',
      'On phones Add to cart stays pinned to the bottom. The page carries product data for Google (price, stock, rating).',
      'Product details carry the declarations India’s Legal Metrology rules require online: generic name, country of origin, net quantity, who made, packed or imported it, consumer care and MRP. They come from the product’s legal details in the CMS.',
      'Save adds the chosen finish to the wishlist. Guests keep it on this device; signing in moves it to the account. Needs the wishlist feature.',
      '“Offers for you” lists public coupons this product qualifies for and the next scheme that covers it, with its real start date. When a scheme is live, the price block shows the scheme price and its end time instead. Codes are applied in the cart; the server decides the final price.',
      'Ratings and reviews come only from shoppers who received this product (verified purchase). The average, the count and the bars use published reviews only. The vendor can reply publicly but never edit a review or hide it for a low rating. Needs the reviews feature.',
      'Product compare comes in Phase 2: up to four products side by side from the attributes marked “Compare” in the attribute set.',
    ],
    render: ({ dev }) => WF.store({
      noBottomNav: true,
      sticky: `<div class="stickybar m-only"><div class="col" style="gap:0"><b>₹5,190</b><span class="xs muted">Matt black</span></div><span class="sp"></span>${btn('Add to cart', { pri: true, lg: true, go: 'st-cart' })}${pin(7)}</div>`,
      body: `
        ${crumbs([['Home', 'st-home'], ['Faucets', 'st-category'], ['Basin mixers', 'st-category'], ['Aria single-lever basin mixer']])}
        <section class="split">
          <div class="col" style="gap:10px">${ph('Main photo · matt black', { ar: '1/1', inner: `<span style="position:absolute;right:10px;bottom:10px" class="pl">${icon('zoom', 12)} Zoom</span>` })}
            <div class="row nw" style="gap:8px">${[0, 1, 2, 3].map(() => ph('', { w: dev === 'm' ? 56 : 72, h: dev === 'm' ? 56 : 72 })).join('')}${zone(ph('', { w: dev === 'm' ? 56 : 72, h: dev === 'm' ? 56 : 72, inner: `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${icon('play', 18)}</span>` }), { flag: 'product-videos' })}</div></div>
          <div class="col" style="gap:14px">
            <div><span class="mn">Model AV-BM-1120-MB</span><h1 style="font-size:${dev === 'm' ? 21 : 27}px;line-height:1.2;margin-top:4px">Aria single-lever basin mixer</h1></div>
            ${zone(`<div class="row small">${icon('star', 14)}<b>4.6</b><span class="muted"><u>38 reviews</u></span><span class="muted">· 92% would recommend</span></div>`, { flag: 'reviews' })}
            <div><div class="pr big"><b>₹5,190</b><s>MRP ₹6,900</s><em>25% off</em>${pin(1)}</div><span class="xs muted">Inclusive of all taxes</span></div>
            <div class="col" style="gap:8px"><span class="small">Finish: <b>Matt black</b> ${pin(2)}</span>
              <div class="row">${[['chrome', 'Chrome', '₹4,250'], ['black', 'Matt black', '₹5,190', 1], ['gold', 'Brushed gold', '₹5,890']].map(([k, l, p, on]) => `<span class="col" style="gap:2px;align-items:center;padding:8px 10px;border-radius:8px;border:${on ? '2px solid var(--ink)' : '1px solid var(--wire)'};min-width:84px">${sw(k)}<span class="xs">${l}</span><span class="xs muted">${p}</span></span>`).join('')}</div></div>
            <div class="row"><span class="small">Quantity</span>${stepper(1)}<span class="small muted">In stock</span></div>
            ${zone(`<div class="card"><div class="cb" style="gap:8px"><span class="small b6">Check delivery ${pin(3)}</span><div class="row nw">${field('', '411045', { cls: 'sp' })}${btn('Check')}</div>
              <div class="col small" style="gap:4px"><span class="row nw">${icon('truck', 14)}Delivery by <b>Wed, 7 Oct</b> to Pune</span><span class="row nw">${icon('check', 14)}Free delivery on this order</span><span class="row nw">${icon('card', 14)}Cash on delivery available</span></div></div></div>`, { flag: 'pincode-check' })}
            <div class="row d-only">${btn('Add to cart', { pri: true, lg: true, cls: 'sp', go: 'st-cart' })}${btn('Buy now', { lg: true, cls: 'sp', go: 'st-checkout' })}</div>
            <div class="row">${zone(btn('Save', { icon: 'heart', go: 'st-wishlist' }), { flag: 'wishlist' })}${pin(9)}${zone(btn('Request a bulk quote', { icon: 'file', go: 'st-contact' }), { flag: 'enquiries' })}${zone(btn('Ask on WhatsApp', { icon: 'whatsapp' }), { flag: 'whatsapp-button' })}${pin(4)}</div>
            ${zone(`<div class="card"><div class="cb" style="gap:6px"><span class="small b6">Offers for you ${pin(10)}</span>
              <div class="row small">${icon('tag', 14)}<span class="sp"><b class="mono">AQUA500</b> ₹500 off orders above ₹20,000</span>${btn('Copy', { sm: true, icon: 'copy' })}</div>
              <div class="row small">${icon('cal', 14)}<span class="sp">Diwali offer: 10% off faucets, from Sun, 1 Nov</span><span class="small muted" ${go('st-offers')}>Details</span></div></div></div>`, { flag: ['coupons', 'schemes'] })}
            ${zone(`<div class="row small">${chk(false, 'Add to compare')}<span class="xs muted">up to 4 products</span>${pin(12)}</div>`, { p2: 'P2', flag: 'compare' })}
            <div class="g c3 small" style="gap:6px">${[['shield', '5-year warranty'], ['refresh', '7-day returns'], ['receipt', 'GST invoice']].map(([ic, t]) => `<span class="row nw">${icon(ic, 14)}${t}</span>`).join('')}</div>
          </div>
        </section>
        <section class="split">
          <div class="col">${H('Highlights')}<ul class="small" style="margin:0;padding-left:18px;display:grid;gap:6px"><li>Solid brass body, lead-free</li><li>35 mm ceramic disc cartridge</li><li>Aerator limits flow to 6 litres a minute</li><li>Fits counter-top and wall-hung basins</li></ul>
            ${H(`Specifications ${pin(5)}`)}
            <table class="spec"><tbody>${[['Material', 'Brass'], ['Mounting', 'Deck mounted'], ['Cartridge', '35 mm ceramic disc'], ['Flow rate', '6 LPM at 3 bar'], ['Working pressure', '0.5 to 5 bar'], ['Spout reach', '120 mm'], ['Height', '165 mm'], ['Warranty', '5 years']].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
            ${H(`Product details ${pin(8)}`)}
            <table class="spec"><tbody>${[['Generic name', 'Basin mixer'], ['Country of origin', 'India'], ['Net quantity', '1 piece'], ['Manufactured by', 'Aquaverde Ceramics Pvt Ltd, Morbi, Gujarat 363642'], ['Consumer care', '1800 000 0000, care@aquaverde.example'], ['MRP', '₹6,900 incl. of all taxes']].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table></div>
          <div class="col">
            ${zone(`<div class="col">${H(`Downloads ${pin(6)}`)}<div class="list small">
              ${[['Aria spec sheet', 'PDF · 420 KB'], ['Installation manual', 'PDF · 1.8 MB']].map(([t, m]) => `<div>${icon('file', 16)}<span class="sp">${t}<span class="xs muted"> · ${m}</span></span>${icon('down', 16)}</div>`).join('')}
            </div></div>`, { flag: 'downloads' })}
            ${zone(`<div class="col">${H('Installation video')}${ph('', { ar: '16/9', inner: `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${icon('play', 28)}</span>` })}</div>`, { flag: 'product-videos' })}
          </div>
        </section>
        ${zone(`<section class="col">${H('Spare parts for this mixer')}<div class="g c4 m2">${[['35 mm cartridge', 'AV-SP-0035', '₹690'], ['Aerator M24', 'AV-SP-0110', '₹190']].map(([t, m, p]) => `<div class="row nw card" style="padding:8px">${ph('', { w: 48, h: 48 })}<div><div class="small b6">${t}</div><div class="mn">${m}</div><b class="small">${p}</b></div></div>`).join('')}</div></section>`, { p2: true, flag: 'spare-parts' })}
        ${zone(`<section class="callout">${icon('shield', 16)}<span class="sp">Bought this already? Register your 5-year warranty.</span>${btn('Register', { sm: true, go: 'st-warranty' })}</section>`, { p2: true, flag: 'warranty' })}
        ${zone(`<section class="col">${H(`Ratings and reviews ${pin(11)}`, '38 verified reviews', btn('See all 38', { ghost: true, sm: true, after: 'chev' }))}
          <div class="split" style="${dev === 'd' ? 'grid-template-columns:260px minmax(0,1fr)' : ''}">
            <div class="col" style="gap:6px"><div class="row nw"><b style="font-size:30px">4.6</b><span class="small muted">out of 5</span></div>
              ${[['5', 74], ['4', 18], ['3', 5], ['2', 0], ['1', 3]].map(([s, pc]) => `<div class="row nw xs" style="gap:6px"><span style="width:18px">${s}${icon('star', 10)}</span><span class="sp" style="height:6px;background:var(--fill-2);border-radius:3px;position:relative;overflow:hidden"><i style="position:absolute;left:0;top:0;bottom:0;width:${pc}%;background:var(--ink)"></i></span><span class="mono" style="width:30px;text-align:right">${pc}%</span></div>`).join('')}
              <div class="row">${chip('With photos 9')}${chip('Matt black 14')}</div>
              <span class="xs muted">Only buyers can review, from their order or the review email.</span></div>
            <div class="col" style="gap:10px">
              <div class="card"><div class="cb" style="gap:5px"><div class="row">${WF.stars('5.0')}<b class="small">Looks premium, no water spots</b></div><span class="xs muted">Meera S., Ahmedabad · Matt black · Verified purchase · 21 Sep</span><p class="small">Fitted it on a counter-top basin. The matt black hides hard-water marks better than our old chrome tap.</p><div class="row">${ph('', { w: 56, h: 56 })}${ph('', { w: 56, h: 56 })}</div><span class="xs muted">12 found this helpful · Helpful · Report</span></div></div>
              <div class="card"><div class="cb" style="gap:5px"><div class="row">${WF.stars('3.0')}<b class="small">Good tap, aerator was loose</b></div><span class="xs muted">Karan P., Indore · Chrome · Verified purchase · 9 Sep</span><p class="small">Works well, but the aerator came loose in a week.</p>
                <div class="callout xs"><span><b>Reply from Aquaverde:</b> Sorry about that. Tighten the aerator with the key in the box, or WhatsApp us and we’ll send a new one free.</span></div></div></div>
            </div></div></section>`, { flag: 'reviews' })}
        <section class="col">${H('Goes well with')}<div class="hs">${[P[5], P[2], P[4], P[1]].map((p) => pcard(p)).join('')}</div></section>`,
    }),
  });

  /* ---------------- Buy ---------------- */
  const cartItem = (dev, t, v, sku, price, mrp) => `
    <div class="row nw" style="align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--fill-2)">${ph('', { w: dev === 'm' ? 72 : 96, h: dev === 'm' ? 72 : 96, go: 'st-product' })}
      <div class="col sp" style="gap:4px"><b class="small">${t}</b><span class="xs muted">${v} · <span class="mono">${sku}</span></span>
        <div class="pr"><b>₹${price}</b><s>₹${mrp}</s></div>
        <div class="row">${stepper(1)}<span class="small muted">Remove</span>${zone('<span class="small muted">Move to wishlist</span>', { flag: 'wishlist' })}</div></div></div>`;
  WF.screen({
    id: 'st-cart', surface: 'st', group: 'Buy', title: 'Cart',
    purpose: 'Review items, see the delivery date and the full price including GST before checkout.',
    route: '/cart', who: 'Shoppers, signed in or not', data: ['carts', 'products', 'variants', 'shipping-zones', 'coupons', 'schemes'], docs: ['docs/11-orders-payments-gst.md'],
    notes: [
      'Every change asks the server to work out the totals again. The browser never sends prices.',
      'A guest cart lives in a cookie for this store and joins the account cart on sign-in.',
      'Stock is reserved only at checkout, not while items sit in the cart.',
      'One coupon per order. The server checks it and, when it can’t be used, says why in plain words (“Add ₹600 more”, “Not with the Diwali offer”). Public codes this cart qualifies for are listed with an Apply button; private codes are only typed. A live scheme’s discount appears on its own line without any code. Needs the coupons feature.',
      'Applied discounts show as separate lines (scheme, coupon) above the total, and the GST note is worked out after them.',
      'Loyalty points come in Phase 2: a balance and “Use points”, capped at a share of the order.',
    ],
    render: ({ dev }) => WF.store({
      noBottomNav: true,
      sticky: `<div class="stickybar m-only"><div class="col" style="gap:0"><b>₹23,640.00</b><span class="xs muted">incl. GST</span></div><span class="sp"></span>${btn('Checkout', { pri: true, lg: true, go: 'st-checkout' })}</div>`,
      body: `
        ${H('Your cart', '2 items')}
        <div class="co">
          <div class="col" style="gap:0">
            ${cartItem(dev, 'Aria single-lever basin mixer', 'Matt black', 'AV-BM-1120-MB', '5,190', '6,900')}
            ${cartItem(dev, 'Nimbus wall-hung WC with soft-close seat', 'White', 'AV-WH-2041-WH', '18,450', '24,990')}
            <div class="row small" style="padding:12px 0">${icon('truck', 14)}<span class="sp">Delivering to <b>411045</b>, Pune · by Wed, 7 Oct</span><span class="muted">Change</span></div>
            ${zone(`<div class="col" style="gap:8px;padding:8px 0"><div class="row nw">${field('', '', { ph: 'Coupon code', cls: 'sp' })}${btn('Apply')}${pin(4)}</div>
              <span class="sec-t">Coupons for this cart</span>
              <div class="row nw small" style="border:1px dashed var(--wire);border-radius:6px;padding:8px">${icon('tag', 14)}<span class="sp"><b class="mono">AQUA500</b> ₹500 off orders above ₹20,000</span>${btn('Apply', { sm: true })}</div>
              <div class="row nw small" style="border:1px dashed var(--wire);border-radius:6px;padding:8px;opacity:.7">${icon('tag', 14)}<span class="sp"><b class="mono">PREPAID5</b> 5% off up to ₹750 when you pay online <span class="xs muted">· choose Pay online at checkout</span></span></div></div>`, { flag: 'coupons' })}
            ${zone(`<div class="row small" style="padding:4px 0">${icon('star', 14)}<span class="sp">You have 120 points (₹120) ${pin(6)}</span>${btn('Use points', { sm: true })}</div>`, { p2: true, flag: 'loyalty' })}
            <div class="col" style="margin-top:18px">${H('Complete the look')}<div class="g c3 m2">${[P[5], P[2]].map((p) => pcard(p, { cta: true })).join('')}</div></div>
          </div>
          ${card(`Price details ${pin(1)}`, `<div class="list small">
              <div><span class="sp">Items (2)</span><span>₹23,640.00</span></div><div><span class="sp">Discounts ${pin(5)}</span><span class="muted">none applied</span></div><div><span class="sp">Delivery</span><span>Free</span></div>
              <div><b class="sp">Total</b><b>₹23,640.00</b></div></div>
            <span class="xs muted">Includes GST of ₹3,606.10. You save ₹8,250 on MRP.</span>
            <span class="d-only">${btn('Checkout', { pri: true, lg: true, block: true, go: 'st-checkout' })}</span>
            <div class="row" style="gap:4px">${['UPI', 'Cards', 'Netbanking', 'COD'].map((p) => `<span class="pl">${p}</span>`).join('')}</div>
            <span class="xs muted">Cart saved on this device ${pin(2)} · Stock is held at checkout ${pin(3)}</span>`)}
        </div>`,
    }),
  });

  WF.screen({
    id: 'st-checkout', surface: 'st', group: 'Buy', title: 'Checkout',
    purpose: 'One page from contact to payment, with no account required, address filled from the pincode and the right payment options for that address.',
    route: '/checkout', who: 'Shoppers, guest or signed in', data: ['orders', 'addresses', 'shipping-zones', 'connector-configs (public part)', 'contact-preferences', 'referrals'], docs: ['docs/11-orders-payments-gst.md', 'docs/09-connectors.md', 'docs/18-notifications.md'],
    notes: [
      'Guests can buy without an account. Signing in only pre-fills details.',
      'The pincode fills city and state. The state is the place of supply, which decides IGST or CGST plus SGST on the invoice.',
      'Pay online opens Razorpay’s own window (UPI, cards, netbanking, wallets). Cash on delivery appears only when the zone and order value allow it, with its fee shown.',
      'Placing the order recomputes every total on the server and holds the stock for 30 minutes while payment completes.',
      'The WhatsApp box names the store and is ticked by default (a vendor setting). Unticked means SMS and email only. Offers need their own unticked box and are never mixed with order updates.',
      'Offer consent is one unticked box per channel. Ticking one lets the store send offers and, if the shopper leaves without paying, up to two cart reminders on that channel. The contact step is saved as soon as it is filled so a reminder can go out; without a ticked box nothing is sent.',
      'A referral (affiliate link in the last 30 days, or an affiliate’s coupon) is attached to the order on the server. The shopper sees nothing extra; affiliates never see the shopper’s name or contact.',
    ],
    render: ({ dev }) => WF.store({
      checkout: true,
      sticky: `<div class="stickybar m-only">${btn('Pay ₹23,640.00', { pri: true, lg: true, block: true, go: 'st-confirmation' })}</div>`,
      body: `
        <div class="co">
          <div class="col" style="gap:16px">
            <div class="card m-only"><div class="cb row" style="flex-direction:row">${icon('cart', 16)}<span class="sp small">Order summary · 2 items</span><b>₹23,640.00</b>${icon('chevd', 14)}</div></div>
            ${card(`1. Contact ${pin(1)}`, `<div class="form">${field('Mobile number', '+91 98xxx xx210', { req: true })}${field('Email', 'rahul.k@example.com', { req: true })}</div>
              <span class="xs muted">We’ll send order updates to this number.</span><div>${chk(true, 'Send me order updates from Aquaverde on WhatsApp')}${pin(5)}</div>${zone(`<div class="col" style="gap:4px"><span class="small">Offers and new launches from Aquaverde ${pin(6)}</span><div class="row">${chk(false, 'By email')}${zone(chk(false, 'On WhatsApp'), { flag: 'whatsapp-offers' })}</div></div>`, { flag: 'offer-messages' })}<span class="small">Have an account? <u${go('st-login')}>Log in</u> to fill this in.</span>`)}
            ${card('2. Delivery address', `<div class="form">
              ${field('Pincode', '411045', { req: true, pin: 2 })}<div class="g c2" style="gap:8px">${field('City', 'Pune')}${field('State', 'Maharashtra')}</div>
              ${field('Full name', 'Rahul Kulkarni', { req: true, cls: 's2' })}${field('Flat, house, building', 'Flat 12, Shanti Kunj', { req: true })}${field('Area, street', 'Baner Road', { req: true })}
              ${field('Landmark', '', { ph: 'Optional' })}<div class="fld"><span class="fl">Address type</span><div class="row">${radio(true, 'Home')}${radio(false, 'Work')}</div></div>
              <div class="s2">${chk(true, 'Billing address is the same')}</div>
              <div class="s2 small">${icon('plus', 12)} Add GSTIN for a business invoice</div></div>`)}
            ${card('3. Delivery', `<div class="row">${radio(true, '<b>Standard</b>')}<span class="sp small muted">Free · arrives by Wed, 7 Oct</span></div>`)}
            ${card(`4. Payment ${pin(3)}`, `
              <div class="card" style="border:2px solid var(--ink)"><div class="cb" style="gap:6px">${radio(true, '<b>Pay online</b>')}<span class="xs muted" style="margin-left:22px">UPI, cards, netbanking, wallets · secured by Razorpay</span><div class="row" style="margin-left:22px;gap:4px">${['UPI', 'Visa', 'RuPay', 'Netbanking'].map((p) => `<span class="pl">${p}</span>`).join('')}</div></div></div>
              ${zone(`<div class="card"><div class="cb" style="gap:4px">${radio(false, '<b>Cash on delivery</b>')}<span class="xs muted" style="margin-left:22px">₹49 fee · pay when it arrives</span></div></div>`, { flag: 'cod' })}`)}
            <span class="d-only">${btn('Pay ₹23,640.00', { pri: true, lg: true, go: 'st-confirmation' })}</span>
            <span class="xs muted">By placing this order you agree to the Terms and the Returns policy.</span>
          </div>
          <div class="d-only">${card(`Order summary ${pin(4)}`, `
            ${[['Aria single-lever basin mixer', 'Matt black', '₹5,190.00'], ['Nimbus wall-hung WC', 'White', '₹18,450.00']].map(([t, v, p]) => `<div class="row nw">${ph('', { w: 44, h: 44 })}<div class="sp"><div class="small">${t}</div><div class="xs muted">${v} · Qty 1</div></div><span class="small">${p}</span></div>`).join('')}
            <div class="list small"><div><span class="sp">Items</span><span>₹23,640.00</span></div><div><span class="sp">Delivery</span><span>Free</span></div><div><b class="sp">To pay</b><b>₹23,640.00</b></div></div>
            <span class="xs muted">Includes GST of ₹3,606.10. Coupons are applied in the cart.</span><span class="xs muted">${pin(7)}</span>`)}</div>
        </div>`,
    }),
  });

  WF.screen({
    id: 'st-confirmation', surface: 'st', group: 'Buy', title: 'Order confirmed',
    purpose: 'Reassure the shopper, show what happens next and give them tracking and the invoice.',
    route: '/checkout/success?order=AQV-10482', who: 'Shoppers', data: ['orders', 'invoices'], docs: ['docs/11-orders-payments-gst.md'],
    notes: [
      'The confirmation email goes out when payment is confirmed. A COD order gets it straight away.',
      'The GST invoice PDF is made a few seconds after payment by a background job; the button appears when it is ready.',
      'Guests can create an account here with a one-time code, and their earlier orders attach to it.',
      'Order numbers run in sequence, so the number in the address never opens an order on its own. Only the browser that placed it (a signed cookie for 24 hours) or a signed-in owner sees this page and the invoice; later, guests use the tracking link or an email code.',
    ],
    render: () => WF.store({
      tab: 'Home',
      body: `
        <section class="col" style="align-items:center;text-align:center;gap:10px;padding-top:12px">
          <span style="width:56px;height:56px;border-radius:50%;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center">${icon('check', 28)}</span>
          <h2 style="font-size:24px">Thank you, Rahul. Your order is placed.</h2>
          <p class="muted">Order <b class="mono">AQV-10482</b> · ₹23,640.00 paid by UPI</p>
          <p class="small muted">We’ve emailed the details to rahul.k@example.com ${pin(1)}</p>
          <div class="row" style="justify-content:center">${btn('Track order', { pri: true, go: 'st-order' })}${btn('Download invoice', { icon: 'down' })}${pin(2)}${pin(4)}${btn('Continue shopping', { ghost: true, go: 'st-home' })}</div>
        </section>
        <section class="split">
          ${card('Delivery', `<b>Arrives by Wed, 7 Oct</b><span class="small muted">Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045</span>`)}
          ${card('Items', `<div class="list small"><div><span class="sp">Aria single-lever basin mixer · Matt black</span><span>₹5,190.00</span></div><div><span class="sp">Nimbus wall-hung WC · White</span><span>₹18,450.00</span></div></div>`)}
        </section>
        <section class="callout">${icon('user', 16)}<span class="sp">Save your details for next time. Create an account with a one-time code. ${pin(3)}</span>${btn('Create account', { sm: true, go: 'st-login' })}</section>`,
    }),
  });

  /* ---------------- Account ---------------- */
  WF.screen({
    id: 'st-login', surface: 'st', group: 'Account', title: 'Log in with a code',
    purpose: 'Passwordless sign-in by email code, with password as an option. The account belongs to this store only.',
    route: '/account/login', who: 'Shoppers', data: ['customers', 'customer-sessions'], docs: ['docs/05-auth-and-roles.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Accounts are per store. A login for Aquaverde does not work on another vendor’s store, even with the same email.',
      'The message is the same whether or not the email has an account. Codes expire in 10 minutes, allow 5 tries and are rate limited.',
      'Phone OTP over SMS or WhatsApp comes in Phase 2 (needs DLT-registered templates). Google sign-in comes later.',
    ],
    render: () => WF.store({
      tab: 'Account',
      body: `<div class="split" style="align-items:center">
        <div class="d-only col">${ph('Brand photo', { ar: '4/3' })}<div class="list small">${['Track orders and download invoices', 'Check out faster with saved addresses', 'Register warranties'].map((t, i) => `<div>${icon('check', 14)}<span>${t}</span>${i === 2 ? tag.p2('P2') : ''}</div>`).join('')}</div></div>
        <div class="card"><div class="cb" style="padding:22px;gap:14px">
          <h2 style="font-size:22px">Log in or create an account ${pin(1)}</h2>
          ${tabs(['Email code', 'Password'], 'Email code')}
          ${field('Email', 'rahul.k@example.com', { lg: true })}
          ${btn('Send code', { pri: true, lg: true, block: true })}
          ${zone(btn('Use mobile number instead', { block: true, icon: 'phone' }), { p2: true })}${pin(3)}
          <div class="hr"></div>
          <span class="small">Enter the 6-digit code sent to <b>r•••@example.com</b></span>
          <div class="otp"><span class="f">2</span><span class="f">7</span><span class="f">0</span><span class="f">4</span><span></span><span></span></div>
          <span class="xs muted">Resend code in 0:28</span>
          ${btn('Verify', { pri: true, lg: true, block: true, go: 'st-account' })}
          <span class="xs muted">If an account exists for this email, we’ve sent a code. New here? The code creates your account. ${pin(2)}</span>
          <div class="row">${btn('Continue with Google', { block: true })}${tag.later()}</div>
        </div></div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'st-account', surface: 'st', group: 'Account', title: 'My account',
    purpose: 'Orders with tracking and invoices, saved addresses and profile, in one place.',
    route: '/account', who: 'Signed-in shoppers', data: ['orders', 'addresses', 'customers', 'wishlists', 'reviews', 'contact-preferences'], docs: ['docs/05-auth-and-roles.md', 'docs/10-storefront-and-vendor-ui.md', 'docs/18-notifications.md'],
    notes: [
      'Orders, tracking, invoices, addresses and profile are in the MVP.',
      'A return can be requested from a delivered order while the return window is open.',
      '“Log out of all devices” ends every session for this account.',
      'Wishlist, My reviews and the affiliate dashboard appear when those features are on (affiliate only for approved affiliates). Warranties and loyalty points come in Phase 2.',
      'Update preferences are kept by phone number, so they also cover guest orders placed with the same number.',
      'Offers by email and by WhatsApp are separate switches from order updates. Turning offers off never stops order updates.',
      '“Write a review” appears on delivered items until they are reviewed. The review is checked by the store before it shows.',
    ],
    render: () => WF.store({
      tab: 'Account',
      body: `<div class="side">
        <aside class="d-only col" style="gap:2px">${[['Orders', 1], ['Addresses'], ['Profile']].map(([t, on]) => `<span class="small" style="padding:8px 10px;border-radius:6px;${on ? 'background:var(--fill);font-weight:600' : ''}">${t}</span>`).join('')}
          <span class="small" style="padding:8px 10px"${go('st-wishlist')}>Wishlist · 3</span><span class="small" style="padding:8px 10px"${go('st-review')}>My reviews · 1 to write</span><span class="small" style="padding:8px 10px"${go('st-affiliate-dash')}>Affiliate dashboard</span>
          ${zone('<span class="small" style="display:block;padding:8px 10px">Warranties</span><span class="small" style="display:block;padding:8px 10px">Loyalty points</span>', { p2: true })}${pin(4)}
          <span class="small" style="padding:8px 10px">Log out</span><span class="small muted" style="padding:8px 10px">Log out of all devices ${pin(3)}</span></aside>
        <div class="col">
          ${H('Hi Rahul', 'rahul.k@example.com')}
          <div class="m-only list">${[['Orders'], ['Wishlist', 'st-wishlist'], ['My reviews', 'st-review'], ['Addresses'], ['Profile']].map(([t, g]) => `<div${go(g)}><span class="sp">${t}</span>${icon('chev', 14)}</div>`).join('')}</div>
          <span class="sec-t">Your orders ${pin(1)}</span>
          ${card('', `<div class="row"><b class="mono small">AQV-10482</b>${pill('Confirmed', 's-ok')}<span class="sp"></span><b class="small">₹23,640.00</b></div><span class="xs muted">Placed Fri, 2 Oct · 2 items</span><div class="row">${ph('', { w: 44, h: 44 })}${ph('', { w: 44, h: 44 })}<span class="sp"></span>${btn('Track order', { sm: true, pri: true, go: 'st-order' })}${btn('Invoice', { sm: true, icon: 'down' })}</div>`)}
          ${card('', `<div class="row"><b class="mono small">AQV-09811</b>${pill('Delivered', 's-ok')}<span class="sp"></span><b class="small">₹4,250.00</b></div><span class="xs muted">Delivered 18 Aug · Return window closed 25 Aug ${pin(2)}</span><div class="row">${ph('', { w: 44, h: 44 })}<span class="sp"></span>${zone(btn('Write a review', { sm: true, icon: 'star', go: 'st-review' }), { flag: 'reviews' })}${pin(7)}${btn('Buy again', { sm: true })}${btn('Invoice', { sm: true, icon: 'down' })}</div>`)}
          ${card('', `<div class="row"><b class="mono small">AQV-09102</b>${pill('Delivered', 's-ok')}<span class="sp"></span><b class="small">₹4,580.00</b></div><span class="xs muted">Delivered 9 Jul · 2 items</span><div class="row">${ph('', { w: 44, h: 44 })}${ph('', { w: 44, h: 44 })}<span class="sp"></span>${zone(btn('Register warranty', { sm: true, go: 'st-warranty' }), { p2: 'P2' })}${btn('Invoice', { sm: true, icon: 'down' })}</div>`)}
          ${card(`Order updates ${pin(5)}`, `<div class="row">${icon('whatsapp', 15)}<span class="sp small">WhatsApp updates to +91 98xxx xx210</span>${tog(true)}</div><div class="row">${icon('chat', 15)}<span class="sp small">SMS updates</span>${tog(true)}</div>`)}
          ${zone(card(`Offers and new launches ${pin(6)}`, `<div class="row">${icon('mail', 15)}<span class="sp small">Offers by email to rahul.k@example.com</span>${tog(true)}</div>${zone(`<div class="row">${icon('whatsapp', 15)}<span class="sp small">Offers on WhatsApp</span>${tog(false)}</div>`, { flag: 'whatsapp-offers' })}<span class="xs muted">At most 2 offer messages a week. Order updates are not affected.</span>`), { flag: 'offer-messages' })}
          ${card('Saved address', `<span class="small"><b>Home</b> · Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045</span><div class="row">${btn('Edit', { sm: true })}${btn('Add address', { sm: true, icon: 'plus' })}</div>`)}
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'st-order', surface: 'st', group: 'Account', title: 'Order tracking',
    purpose: 'Where the order is, when it arrives, the invoice, and what the shopper can still do (cancel, return, get help).',
    route: '/account/orders/AQV-10482', who: 'Signed-in shoppers; guests after a one-time code sent to the order’s email', data: ['orders', 'shipments', 'invoices', 'order-events'], docs: ['docs/11-orders-payments-gst.md'],
    notes: [
      'Drawn on 3 October, after the vendor marked it packed and added the shipment. The steps mirror the statuses staff set in the CMS.',
      'With Shiprocket (Phase 1), the AWB, courier and tracking updates arrive automatically. For manual shipments the link comes from the carrier and AWB number staff typed.',
      'The invoice is a GST invoice PDF with the vendor’s GSTIN, HSN codes and the IGST line.',
      'Cancel is possible until the order ships. Returns open for 7 days after delivery, with photos.',
      'Shoppers can stop WhatsApp or SMS updates here, on the tracking page, or by replying STOP on WhatsApp.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Account',
      body: `
        ${crumbs([['Account', 'st-account'], ['Orders', 'st-account'], ['AQV-10482']])}
        ${H(`Order AQV-10482 ${pill('Shipped', 's-ok')}`, 'Placed Fri, 2 Oct · Paid by UPI')}
        ${card(`Delivery ${pin(1)}`, `<div class="track">${[['Placed', '2 Oct', 'done'], ['Confirmed', '2 Oct', 'done'], ['Packed', '3 Oct', 'done'], ['Shipped', '3 Oct', 'now'], ['Delivered', 'by 7 Oct', '']].map(([t, d, s]) => `<div class="${s}"><i>${s === 'done' ? icon('check', 11) : ''}</i><span>${t}</span><span class="xs faint">${d}</span></div>`).join('')}</div>
          <div class="row small" style="margin-top:6px">${icon('truck', 14)}<span class="sp">Delhivery · AWB <span class="mono">1490 2210 0458</span></span>${btn('Track on Delhivery', { sm: true, icon: 'ext' })}${pin(2)}</div>`)}
        <section class="split">
          ${card('Items', `<div class="list small"><div>${ph('', { w: 44, h: 44 })}<span class="sp">Aria single-lever basin mixer<br><span class="xs muted">Matt black · Qty 1</span></span><span>₹5,190.00</span></div><div>${ph('', { w: 44, h: 44 })}<span class="sp">Nimbus wall-hung WC<br><span class="xs muted">White · Qty 1</span></span><span>₹18,450.00</span></div></div>
            <div class="list small"><div><span class="sp">Delivery</span><span>Free</span></div><div><b class="sp">Total</b><b>₹23,640.00</b></div></div><span class="xs muted">Includes IGST of ₹3,606.10</span>`)}
          <div class="col">
            ${card('Delivery address', `<span class="small">Rahul Kulkarni<br>Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045</span>`)}
            ${card(`Order updates ${pin(5)}`, `<div class="row">${icon('whatsapp', 15)}<span class="sp small">WhatsApp to +91 98xxx xx210</span>${tog(true)}</div><div class="row">${icon('chat', 15)}<span class="sp small">SMS when WhatsApp can’t reach you</span>${tog(true)}</div>`)}
            <div class="row">${btn('Download invoice', { icon: 'down' })}${pin(3)}${btn('Get help on WhatsApp', { icon: 'whatsapp' })}</div>
            <div class="callout small">${icon('refresh', 14)}<span class="sp">Can’t cancel now that it has shipped. Returns open for 7 days after delivery. ${pin(4)}</span>${btn('Request return', { sm: true, danger: true })}</div>
          </div>
        </section>`,
    }),
  });

  WF.screen({
    id: 'st-wishlist', surface: 'st', group: 'Account', title: 'Wishlist',
    purpose: 'Products the shopper saved to come back to, with today’s price, offers and stock.',
    route: '/wishlist', who: 'Shoppers, signed in or not', data: ['wishlists', 'products', 'variants', 'schemes'], docs: ['docs/07-api.md', 'docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Hearts on product cards and the Save button on the product page add here. Guests keep the list on this device; signing in moves it into the account so it follows them to other devices.',
      'Prices, offers and stock are read fresh every time. A product covered by a live scheme shows the scheme price and its real end date; a sold-out finish says so and can’t be moved to the cart.',
      '“Move to cart” adds the saved finish and removes it from the list. Remove offers Undo for a few seconds.',
      'Needs the wishlist feature. Price-drop and back-in-stock alerts for saved products are Later.',
    ],
    render: ({ dev }) => {
      const item = (t, v, model, price, extra, stock, ok = true) => `<div class="row nw" style="align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--fill-2)">${ph('', { w: dev === 'm' ? 72 : 96, h: dev === 'm' ? 72 : 96, go: 'st-product' })}
        <div class="col sp" style="gap:4px"><b class="small">${t}</b><span class="xs muted">${v} · <span class="mono">${model}</span></span>${price}${extra}<span class="xs ${ok ? 'muted' : 'b6'}">${stock}</span>
          <div class="row">${ok ? btn('Move to cart', { sm: true, pri: true, go: 'st-cart' }) : btn('Move to cart', { sm: true })}<span class="small muted">Remove</span></div></div></div>`;
      return WF.store({
        tab: 'Account',
        body: `<div class="col" style="gap:14px;max-width:820px;width:100%;margin:0 auto">
          ${H(`Your wishlist ${pin(1)}`, '3 saved')}
          <div class="callout small">${icon('heart', 14)}<span class="sp">Saved on this device. Log in to keep your wishlist on all your devices.</span>${btn('Log in', { sm: true, go: 'st-login' })}</div>
          <div class="col" style="gap:0">
            ${item('Rainline 200 mm overhead shower', 'Matt black', 'AV-OS-3200-MB', `<div class="pr"><b>₹2,290</b><s>₹3,500</s><em>35% off</em></div>`, `<span class="xs">Launch price until Sat, 31 Oct ${pin(2)}</span>`, 'In stock')}
            ${item('Aria tall basin mixer', 'Brushed gold', 'AV-BM-1125-BG', `<div class="pr"><b>₹7,450</b><s>₹9,500</s><em>22% off</em></div>`, '', 'In stock')}
            ${item('Quadra towel rail 600', 'Chrome', 'AV-TR-6060-CP', `<div class="pr"><b>₹1,890</b><s>₹2,490</s><em>24% off</em></div>`, '', 'Out of stock', false)}
          </div>
          <span class="xs muted">Move to cart adds the finish you saved ${pin(3)} · Price alerts come later ${pin(4)}</span>
        </div>`,
      });
    },
  });

  WF.screen({
    id: 'st-review', surface: 'st', group: 'Account', title: 'Write a review',
    purpose: 'A buyer rates and reviews a product they received, from the review email or from their orders.',
    route: '/review/<token> · /account (Write a review)', who: 'Shoppers who received the product', data: ['reviews', 'orders', 'media'], docs: ['docs/06-data-model.md', 'docs/14-security-and-compliance.md', 'docs/18-notifications.md'],
    notes: [
      'Only delivered order items can be reviewed, one review per item. The link in the review email carries a single-use token, so no login is needed; from the account the order proves the purchase.',
      'Stars are required; title, text and up to 4 photos are optional. Photos are re-encoded and their location data removed.',
      'The store checks reviews before they show (a vendor setting). It publishes honest reviews whatever the rating and rejects only abuse, personal details, spam or text not about the product, with the reason kept.',
      'The name shown is first name and initial with the city, chosen here. Email and phone are never shown.',
      'Nothing is offered in return for a review or for a good rating (docs/14).',
    ],
    render: () => WF.store({
      tab: 'Account',
      body: `<div class="col" style="gap:16px;max-width:680px;width:100%;margin:0 auto">
        ${H(`Review your purchase ${pin(1)}`, 'Order AQV-09811 · delivered Tue, 18 Aug')}
        <div class="row nw card" style="padding:10px">${ph('', { w: 64, h: 64 })}<div class="sp"><b class="small">Aria single-lever basin mixer</b><div class="xs muted">Matt black · <span class="mono">AV-BM-1120-MB</span></div></div>${pill('Verified purchase', 's-ok')}</div>
        ${card('', `<div class="form">
          <div class="fld s2"><span class="fl">Your rating <b class="req">*</b></span><div class="row" style="gap:6px">${[1, 2, 3, 4, 5].map((i) => `<span style="width:36px;height:36px;border:1px solid ${i <= 4 ? 'var(--ink)' : 'var(--wire)'};border-radius:8px;display:flex;align-items:center;justify-content:center;${i <= 4 ? 'background:var(--fill)' : ''}">${icon('star', 18)}</span>`).join('')}<span class="small">4 of 5 · Good</span></div></div>
          ${field('Title', 'Looks premium, easy to fit', { cls: 's2' })}
          ${field('Your review', 'Fitted it myself with the video. The matt black finish hides water spots. Lever is a little stiff in the first week.', { ta: true, cls: 's2' })}
          <div class="fld s2"><span class="fl">Photos ${pin(2)}</span><div class="row">${ph('', { w: 64, h: 64 })}<div class="in" style="width:64px;height:64px;border-style:dashed;justify-content:center">${icon('plus', 16)}</div><span class="xs muted">Up to 4 photos</span></div></div>
          ${field('Show my name as', 'Rahul K., Pune', { sel: true, help: 'Your email and phone are never shown', pin: 4 })}
          <div class="s2">${btn('Submit review', { pri: true, lg: true, go: 'st-account' })}</div>
        </div>`)}
        <div class="callout small">${icon('shield', 14)}<span>We check reviews before they appear, usually within two days. We publish honest reviews, good or bad. ${pin(3)} ${pin(5)}</span></div>
      </div>`,
    }),
  });

  /* ---------------- Order updates (docs/18) ---------------- */
  const journey = () => `<div class="track">${[['Placed', '2 Oct', 'done'], ['Confirmed', '2 Oct', 'done'], ['Packed', '3 Oct', 'done'], ['Shipped', '3 Oct', 'now'], ['Delivered', 'by 7 Oct', '']].map(([t, d, s]) => `<div class="${s}"><i>${s === 'done' ? icon('check', 11) : ''}</i><span>${t}</span><span class="xs faint">${d}</span></div>`).join('')}</div>`;

  WF.screen({
    id: 'st-track', surface: 'st', group: 'Order updates', title: 'Tracking page (no login)',
    purpose: 'The page behind the “Track order” link in every WhatsApp, SMS and email: where the parcel is, without signing in.',
    route: '/t/K7Q2M9XW4P', who: 'Anyone with the link', data: ['orders (trackingCode)', 'shipments', 'contact-preferences'], docs: ['docs/18-notifications.md', 'docs/07-api.md'],
    notes: [
      'Every message links here on the vendor’s own domain, so the link is whitelisted on DLT once and needs no third-party link shortener.',
      'The random code in the link shows the journey, courier and tracking number only. Address, phone and invoice need the shopper to log in or enter a one-time code.',
      '“Stop updates” turns off WhatsApp and SMS for this order’s phone number. Order emails still arrive.',
      'The page is rate limited so codes can’t be guessed in bulk.',
    ],
    render: () => WF.store({
      tab: 'Account',
      body: `<div class="col" style="gap:16px;max-width:720px;width:100%;margin:0 auto">
        ${H(`Order AQV-10482 ${pin(1)}`, 'Shipped · arriving by Wed, 7 Oct')}
        ${card('', `${journey()}<div class="row small" style="margin-top:6px">${icon('truck', 14)}<span class="sp">Delhivery · AWB <span class="mono">1490 2210 0458</span></span>${btn('Track on Delhivery', { sm: true, icon: 'ext' })}</div>`)}
        ${card('In this parcel', `<div class="list small"><div>${ph('', { w: 40, h: 40 })}<span class="sp">Aria single-lever basin mixer · Matt black</span><span>× 1</span></div><div>${ph('', { w: 40, h: 40 })}<span class="sp">Nimbus wall-hung WC · White</span><span>× 1</span></div></div>
          <div class="callout small">${icon('lock', 14)}<span class="sp">Address and invoice are hidden on this page. ${pin(2)}</span>${btn('Log in to see more', { sm: true, go: 'st-login' })}</div>`)}
        ${card(`Updates for +91 98xxx xx210 ${pin(3)}`, `<div class="row">${icon('whatsapp', 15)}<span class="sp small">WhatsApp updates</span>${tog(true)}</div><div class="row">${icon('chat', 15)}<span class="sp small">SMS updates</span>${tog(true)}</div><div>${btn('Stop updates for this number', { sm: true, danger: true })}</div>`)}
        <span class="xs muted">Opened from a Track order link ${pin(4)}</span>
      </div>`,
    }),
  });

  WF.screen({
    id: 'st-messages', surface: 'st', group: 'Order updates', title: 'What the shopper receives',
    purpose: 'The order updates as they arrive on the shopper’s phone: WhatsApp from the vendor’s own number, and SMS when WhatsApp can’t reach them.',
    route: 'Shopper’s WhatsApp and SMS apps', who: 'Shoppers', data: ['notification-logs', 'notification-templates'], docs: ['docs/18-notifications.md', 'docs/adr/0005-per-vendor-messaging-senders.md'],
    notes: [
      'Messages come from the vendor’s own WhatsApp number and name, so shoppers see “Aquaverde”, never the platform.',
      'Each one is a Meta-approved utility template: facts about this order only. Adding offers would make Meta treat it as marketing, which costs much more.',
      'Every message has a “Track order” button to the tracking page on the vendor’s domain. “Stop updates”, or replying STOP, turns WhatsApp updates off.',
      'In the MVP the updates number doesn’t take chats. Any reply gets one automatic answer per day pointing to the vendor’s chat number, phone and email, and the reply shows on the order in the CMS.',
      'SMS goes out for out for delivery, and for other steps only when WhatsApp can’t reach the shopper. It is one-way, fits in one SMS, and every link and number in it is whitelisted on DLT.',
    ],
    render: ({ dev }) => {
      const track = `<div class="wa-btn"${go('st-track')}>${icon('ext', 13)} Track order</div>`;
      const wa = `<div class="phone"><div class="wa wa-app">
        <div class="wa-h">${icon('back', 16)}${ph('', { w: 30, h: 30, cls: 'round' })}<div class="sp"><b class="small">Aquaverde ${pin(1)}</b><div class="xs muted">Business account</div></div>${icon('phone', 16)}</div>
        <span class="wa-day">Friday</span>
        <div class="wa-b">Hi Rahul, your Aquaverde order AQV-10482 is confirmed. Total ₹23,640, paid. We’ll message you when it ships.<span class="wa-t">09:41</span></div>
        ${track}<div class="wa-btn">Stop updates</div>
        <span class="wa-day">Saturday</span>
        <div class="wa-b">Hi Rahul, your Aquaverde order AQV-10482 has shipped with Delhivery.<br>Tracking number: 1490 2210 0458<br>Expected delivery: Wed 7 Oct<br>We’ll message you again when it is out for delivery. ${pin(2)}<span class="wa-t">16:05</span></div>
        ${track}<span style="align-self:flex-start">${pin(3)}</span>
        <div class="wa-b me">Can it come after 6 pm?<span class="wa-t">16:20</span></div>
        <div class="wa-b">Thanks for your message. This number only sends order updates. For help, WhatsApp us on +91 90000 00000, call 1800 000 0000 or email care@aquaverde.example. ${pin(4)}<span class="wa-t">16:20</span></div>
        <span class="wa-day">Wednesday</span>
        <div class="wa-b">Hi Rahul, your Aquaverde order AQV-10482 is out for delivery today.<span class="wa-t">09:12</span></div>
        ${track}
      </div></div>`;
      const sms = `<div class="phone"><div class="sms">
        <div class="wa-h">${icon('back', 16)}<div class="sp"><b class="small mono">VM-AQUABT-S</b><div class="xs muted">This sender can’t receive replies</div></div></div>
        <span class="wa-day">Wednesday</span>
        <div class="sms-b">Aquaverde: your order AQV-10482 is out for delivery today. Track: https://aquaverde.tenantecom.in/t/K7Q2M9XW4P<span class="wa-t">09:12</span></div>
        <span class="wa-day">Example: shopper not on WhatsApp</span>
        <div class="sms-b">Your Aquaverde order AQV-10482 has shipped via Delhivery, tracking no. 1490 2210 0458. Track: https://aquaverde.tenantecom.in/t/K7Q2M9XW4P<span class="wa-t">16:05</span></div>
      </div></div>`;
      const label = (t) => `<span class="sec-t">${t}</span>`;
      if (dev === 'm') {
        return `<div class="col" style="gap:0">${wa}<div style="padding:12px 14px 4px;background:var(--paper)">${label(`SMS on the same phone ${pin(5)}`)}</div>${sms}</div>`;
      }
      return `<div style="padding:32px;background:var(--fill);display:flex;gap:48px;justify-content:center;align-items:flex-start;min-height:800px">
        <div class="col" style="gap:10px;align-items:center">${label('WhatsApp')}${wa}</div>
        <div class="col" style="gap:10px;align-items:center">${label(`SMS ${pin(5)}`)}${sms}</div>
      </div>`;
    },
  });

  /* ---------------- Offers (schemes, coupons, offer messages; docs/11, docs/18) ---------------- */
  WF.screen({
    id: 'st-offers', surface: 'st', group: 'Offers', title: 'Offers page',
    purpose: 'Every live offer in one place: festival schemes, launch prices and public coupon codes, with honest dates and a way to hear about the next one.',
    route: '/offers · /offers/<scheme-slug>', who: 'Shoppers', data: ['schemes', 'coupons', 'contact-preferences'], docs: ['docs/11-orders-payments-gst.md', 'docs/14-security-and-compliance.md', 'docs/18-notifications.md'],
    notes: [
      'Live schemes come first, each with its rule in plain words, what it covers and its real end time. The countdown is the scheme’s own end; nothing restarts or extends it.',
      'Upcoming schemes show only when the vendor ticked “Show before it starts”, with their real start date. Prices don’t change until the scheme starts.',
      'Each scheme has a landing page at /offers/<slug> listing the products it covers with their offer prices. After the scheme ends the page stays up saying the offer has ended, so shared links don’t break.',
      'Public coupon codes are listed with a copy button; private codes never appear. One coupon per order, and a scheme can block coupons.',
      'The sign-up stores offer consent per channel, unticked. Order updates are separate. Needs offer-messages; the WhatsApp box shows only when the platform team has switched WhatsApp offers on for this vendor. The page needs schemes or coupons.',
      'In Phase 2, trade partners signed in to their trade account also see their trade schemes here.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Shop',
      body: `
        ${H(`Offers ${pin(1)}`, 'Prices include GST. Offers end at the time shown.')}
        ${zone(`<section class="col" style="gap:10px"><span class="sec-t">Live now</span>
          <div class="card" style="border:1.5px solid var(--ink)"><div class="cb split" style="gap:14px">${ph('Rainline launch banner', { ar: dev === 'm' ? '16/9' : '16/7' })}
            <div class="col" style="gap:8px;justify-content:center"><span class="pl">Special launch offer</span><h3 style="font-size:20px">Rainline 200 mm overhead shower at ₹2,290</h3><p class="small muted">Launch price instead of ₹2,690 (MRP ₹3,500), chrome and matt black. Works with coupons.</p>
              <div class="row small">${icon('cal', 14)}<span>Ends Sat, 31 Oct, 11:59 pm</span><span class="mono">28 d 13 h left</span></div>${btn('Shop the launch', { pri: true, go: 'st-product' })}</div></div></div></section>`, { flag: 'schemes' })}
        ${zone(`<section class="col" style="gap:10px"><span class="sec-t">Coming up ${pin(2)}</span>
          <div class="g c2 m1">
            ${card('', `<span class="pl">Diwali</span><b>10% off all faucets and showers, up to ₹1,500</b><span class="small muted">Sun, 1 Nov to Mon, 9 Nov · on orders above ₹3,000 · not with coupons</span>${btn('Remind me', { sm: true })}`)}
            ${card('', `<span class="pl">Wedding Season</span><b>Spend ₹25,000, get ₹2,000 off; spend ₹50,000, get ₹5,000 off</b><span class="small muted">Fri, 20 Nov to Mon, 15 Feb · whole store</span>${btn('Remind me', { sm: true })}`)}
          </div><span class="xs muted">Each offer has its own page with the products it covers ${pin(3)}</span></section>`, { flag: 'schemes' })}
        ${zone(`<section class="col" style="gap:10px"><span class="sec-t">Coupon codes ${pin(4)}</span>
          <div class="g c2 m1">
            <div class="row nw card" style="padding:12px;border-style:dashed"><div class="sp"><b class="mono">AQUA500</b><div class="small">₹500 off orders above ₹20,000</div><div class="xs muted">Until 31 Dec · once per customer</div></div>${btn('Copy', { sm: true, icon: 'copy' })}</div>
            <div class="row nw card" style="padding:12px;border-style:dashed"><div class="sp"><b class="mono">PREPAID5</b><div class="small">5% off up to ₹750 when you pay online</div><div class="xs muted">Not with cash on delivery</div></div>${btn('Copy', { sm: true, icon: 'copy' })}</div>
          </div></section>`, { flag: 'coupons' })}
        ${zone(`<section class="card"><div class="cb" style="gap:10px"><h3 style="font-size:18px">Hear about the next offer first ${pin(5)}</h3>
          <div class="row nw">${field('', '', { ph: 'Email or WhatsApp number', cls: 'sp' })}${btn('Sign up', { pri: true })}</div>
          <div class="row">${chk(false, 'Send me offers by email')}${zone(chk(false, 'Send me offers on WhatsApp'), { flag: 'whatsapp-offers' })}</div>
          <span class="xs muted">From Aquaverde only. At most 2 a week. Unsubscribe in one tap from any message.</span></div></section>`, { flag: 'offer-messages' })}
        ${zone(`<div class="callout small">${icon('store', 14)}<span>Trade partners see their trade schemes here when signed in to a trade account. ${pin(6)}</span></div>`, { p2: true, flag: 'trade-schemes' })}`,
    }),
  });

  WF.screen({
    id: 'st-offer-messages', surface: 'st', group: 'Offers', title: 'Offer messages the shopper receives',
    purpose: 'What an opted-in shopper gets: an abandoned cart email, a festival offer on WhatsApp from the vendor’s own number, and the one-tap unsubscribe page.',
    route: 'Shopper’s email and WhatsApp · /cart/restore/<token> · /unsubscribe/<token>', who: 'Shoppers who opted in to offers', data: ['offer-campaigns', 'notification-logs', 'contact-preferences', 'carts'], docs: ['docs/18-notifications.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Sent only on channels where the shopper ticked the offers box. Order updates never carry offers, and offers never use order-update templates.',
      'Abandoned cart: first reminder an hour after the cart goes quiet, an optional second after 24 hours, never more. The button restores this exact cart on any device for 7 days. Ordering, emptying the cart or unsubscribing stops the reminders.',
      'WhatsApp offers are Meta “marketing” templates from the vendor’s own number, about ₹1.02 each including GST on the vendor’s Meta bill. Each has a “Stop offers” button. Sent only when the platform team has switched WhatsApp offers on for this vendor; otherwise offers and reminders go by email.',
      'Every offer email has an Unsubscribe link and one-click unsubscribe headers. The page confirms in one tap and keeps order updates on.',
      'At most 2 offer messages a week per shopper (vendor setting, platform cap 3), sent only between 10:00 and 20:00.',
    ],
    render: ({ dev }) => {
      const email = `<div class="card" style="width:${dev === 'm' ? '100%' : '380px'}"><div class="cb" style="gap:8px">
        <div class="xs muted">From <b>Aquaverde</b> &lt;offers@news.aquaverde.example&gt;</div><b class="small">You left these in your cart ${pin(2)}</b>
        <div class="hr"></div><span class="sf-logo" style="align-self:flex-start">AQUAVERDE</span><p class="small">Hi Rahul, your cart is saved. Prices include GST and can change when an offer ends.</p>
        <div class="list small"><div>${ph('', { w: 44, h: 44 })}<span class="sp">Aria single-lever basin mixer · Matt black</span><b>₹5,190</b></div><div>${ph('', { w: 44, h: 44 })}<span class="sp">Nimbus wall-hung WC · White</span><b>₹18,450</b></div></div>
        ${btn('Return to your cart', { pri: true, block: true, go: 'st-cart' })}
        <span class="xs muted">You get this because you asked for offers from Aquaverde by email. <u>Unsubscribe</u> · Aquaverde Ceramics Pvt Ltd, Survey 112, NH 8-A, Morbi, Gujarat 363642</span></div></div>`;
      const wa = `<div class="phone"><div class="wa wa-app">
        <div class="wa-h">${icon('back', 16)}${ph('', { w: 30, h: 30, cls: 'round' })}<div class="sp"><b class="small">Aquaverde</b><div class="xs muted">Business account</div></div></div>
        <span class="wa-day">Sunday</span>
        ${ph('Diwali banner', { h: 120 })}
        <div class="wa-b">Hi Rahul, our Diwali offer is on: 10% off all faucets and showers, up to ₹1,500, on orders above ₹3,000. Ends Mon, 9 Nov. ${pin(3)}<span class="wa-t">10:30</span></div>
        <div class="wa-btn">${icon('ext', 13)} Shop the offer</div><div class="wa-btn">Stop offers</div>
      </div></div>`;
      const unsub = `<div class="card" style="width:${dev === 'm' ? '100%' : '320px'}"><div class="cb" style="gap:10px;text-align:center;align-items:center"><span class="sf-logo">AQUAVERDE</span><b>You won’t get offer emails from Aquaverde</b><span class="small muted">rahul.k@example.com · Order updates for your orders still arrive. ${pin(4)}</span>${btn('Undo', { sm: true })}<span class="xs muted">Change offers on WhatsApp in your account</span></div></div>`;
      const label = (t) => `<span class="sec-t">${t}</span>`;
      if (dev === 'm') return `<div class="col" style="gap:14px;padding:14px;background:var(--fill)">${label(`Email: abandoned cart ${pin(1)}`)}${email}${label('WhatsApp: festival offer')}${wa}${label('Unsubscribe page')}${unsub}<span class="xs muted">Caps and send window ${pin(5)}</span></div>`;
      return `<div style="padding:32px;background:var(--fill);display:flex;gap:28px;justify-content:center;align-items:flex-start;min-height:800px;flex-wrap:wrap">
        <div class="col" style="gap:10px">${label(`Email: abandoned cart ${pin(1)}`)}${email}</div>
        <div class="col" style="gap:10px;align-items:center">${label('WhatsApp: festival offer')}${wa}</div>
        <div class="col" style="gap:10px">${label('Unsubscribe page')}${unsub}<span class="xs muted">Caps and send window ${pin(5)}</span></div>
      </div>`;
    },
  });

  /* ---------------- Affiliates (docs/11 commissions) ---------------- */
  WF.screen({
    id: 'st-affiliate', surface: 'st', group: 'Affiliates', title: 'Affiliate program',
    purpose: 'Invite creators, stylists and fitters to promote the store for a commission, and take their application.',
    route: '/affiliate', who: 'Anyone; applying needs a store account', data: ['affiliates', 'customers'], docs: ['docs/11-orders-payments-gst.md', 'docs/14-security-and-compliance.md', 'docs/05-auth-and-roles.md'],
    notes: [
      'Commission is a share of the order value before GST, delivery and COD fee, after discounts. It is confirmed once the return window closes and cancelled if the order is cancelled or returned.',
      'Applying needs a store account (email code). The vendor approves each application; approved affiliates get a link (/r/CODE) and can be given a personal coupon.',
      'The vendor pays affiliates itself each month by UPI or bank transfer and records it. Above ₹20,000 a year, 2% TDS is deducted (20% without PAN), so PAN is asked before the first payout.',
      'Affiliates must say a post is a paid partnership. The terms they accept say so; the vendor writes the terms.',
      'Needs the affiliate feature. Interior designers join as trade partners in Phase 2, with commission on client orders.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Home',
      body: `<div class="split" style="align-items:start">
        <div class="col" style="gap:14px">
          ${ph('Creator photo', { ar: '16/10' })}
          <h2 style="font-size:${dev === 'm' ? 22 : 28}px;line-height:1.2">Earn with Aquaverde ${pin(1)}</h2>
          <p class="muted">Share bathrooms you love. Earn 5% of every order you refer, paid monthly.</p>
          <div class="list small">${[['Apply with your store account', 'We reply within 3 working days'], ['Share your link or code', 'Instagram, YouTube, WhatsApp or your website'], ['Earn on delivered orders', 'Confirmed after the 7-day return window']].map(([t, s], i) => `<div><b class="mono">${i + 1}</b><div class="sp"><b>${t}</b><div class="xs muted">${s}</div></div></div>`).join('')}</div>
          <div class="callout small">${icon('receipt', 14)}<span>Paid by Aquaverde by UPI or bank transfer each month, once you have ₹500 or more confirmed. TDS applies above ₹20,000 a year. ${pin(3)}</span></div>
        </div>
        ${card(`Apply ${pin(2)}`, `<div class="form">
          ${field('Full name', 'Riya Sharma', { req: true })}${field('Mobile', '+91 98xxx xx455', { req: true })}
          <div class="fld s2"><span class="fl">Where do you share? <b class="req">*</b></span><div class="row">${['Instagram', 'YouTube', 'Website', 'WhatsApp groups', 'In person'].map((t, i) => chip(t, { on: i === 0 })).join('')}</div></div>
          ${field('Profile link', 'instagram.com/riya.homes', { cls: 's2' })}
          ${field('Tell us about your audience', 'Home styling for apartments in Pune and Mumbai, about 18,000 followers.', { ta: true, cls: 's2' })}
          ${field('PAN', '', { ph: 'Needed before your first payout', cls: 's2' })}
          <div class="s2">${chk(false, 'I accept the affiliate terms and will mark my posts as a paid partnership')} ${pin(4)}</div>
          <div class="s2">${chk(false, 'Also send me offers by email')}</div>
          <div class="s2">${btn('Send application', { pri: true, lg: true, go: 'st-affiliate-dash' })}</div>
          <span class="xs muted s2">Signed in as riya@example.com ${pin(5)}</span>
        </div>`)}
      </div>`,
    }),
  });

  WF.screen({
    id: 'st-affiliate-dash', surface: 'st', group: 'Affiliates', title: 'Affiliate dashboard',
    purpose: 'An approved affiliate’s link and code, referred orders, commission by status and payouts.',
    route: '/affiliate/dashboard', who: 'Approved affiliates (signed in)', data: ['affiliates', 'referrals', 'affiliate-payouts', 'affiliate-clicks'], docs: ['docs/11-orders-payments-gst.md', 'docs/07-api.md'],
    notes: [
      'Referred orders show date, order value and commission only. Affiliates never see the shopper’s name, phone or address.',
      'Pending commission waits for the order’s return window; approved commission goes into the next monthly statement; a cancelled or returned order reverses it, with the reason.',
      'Any store page can be turned into a referral link. The link sets a 30-day cookie; the last link clicked wins. The personal coupon also credits the affiliate, but never for their own orders.',
      'Statements show gross commission, TDS and the amount paid with the UTR, as a PDF. Payout details are stored encrypted and shown masked; changing them sends an email to the affiliate.',
    ],
    render: ({ dev }) => WF.store({
      tab: 'Account',
      body: `<div class="col" style="gap:16px">
        ${H(`Hi Riya ${pin(1)}`, 'Affiliate since 12 Aug · 5% on all products, 8% on showers')}
        <div class="g c4 m2">${WF.kpi('Clicks, 30 days', '1,240')}${WF.kpi('Orders, 30 days', '18')}${WF.kpi('Pending', '₹2,140', 'return windows open', { pin: 2 })}${WF.kpi('Approved', '₹1,180', 'paid in early November')}</div>
        <div class="split">
          ${card(`Your link and code ${pin(3)}`, `
            <div class="fld"><span class="fl">Link</span><div class="row nw"><span class="in sp mono xs">aquaverde.tenantecom.in/r/RIYA</span>${btn('', { icon: 'copy', sm: true, label: 'Copy' })}${btn('', { icon: 'whatsapp', sm: true, label: 'Share on WhatsApp' })}</div></div>
            <div class="fld"><span class="fl">Link to any page</span><div class="row nw">${field('', '', { ph: 'Paste a product or category address', cls: 'sp' })}${btn('Make link', { sm: true })}</div></div>
            <div class="fld"><span class="fl">Your coupon</span><div class="row nw"><span class="in sp"><b class="mono">RIYA10</b>&nbsp;· 10% off up to ₹1,000 for your followers</span>${btn('', { icon: 'copy', sm: true, label: 'Copy' })}</div></div>`)}
          ${card(`Payouts ${pin(4)}`, `<div class="list small">
              <div>${icon('file', 14)}<div class="sp"><b class="mono">PAY/26-27/0012</b><div class="xs muted">September · gross ₹4,900 · TDS ₹0 · paid 2 Oct · UTR ending 7731</div></div><b>₹4,900</b></div>
              <div>${icon('file', 14)}<div class="sp"><b class="mono">PAY/26-27/0007</b><div class="xs muted">August · gross ₹2,350 · TDS ₹0 · paid 1 Sep</div></div><b>₹2,350</b></div></div>
            <div class="row small">${icon('card', 14)}<span class="sp">UPI ri••••@okaxis · PAN ABCPS••••K</span>${btn('Edit', { sm: true })}</div>`)}
        </div>
        ${card('Referred orders', table(['Date', '>Order value', '>Commission', 'Status'], [
          ['2 Oct', '₹20,033.90', '₹1,001.70', pill('Pending: not delivered yet', 's-warn')],
          ['29 Sep', '₹1,940.68', '₹155.25', `${pill('Pending until 9 Oct', 's-warn')}<span class="sub">Shower, 8%</span>`],
          ['21 Sep', '₹3,601.69', '₹180.08', pill('Approved', 's-ok')],
          ['14 Sep', '₹4,398.31', '₹219.92', `${pill('Reversed', 's-bad')}<span class="sub">Returned</span>`],
        ], { go: null }) + `<p class="xs muted" style="padding:8px 14px">Order value before GST, delivery and COD fee</p>`, { flat: true })}
      </div>`,
    }),
  });

  /* ---------------- Store info ---------------- */
  WF.screen({
    id: 'st-dealers', surface: 'st', group: 'Store info', title: 'Dealer locator',
    purpose: 'Find the nearest dealer or experience centre to see products in person, call them, message them or get directions.',
    route: '/dealers?near=411045', who: 'Shoppers, fitters, architects', data: ['dealers'], docs: ['docs/08-modules-and-feature-flags.md'],
    notes: [
      'Shown only with the dealer-locator feature, typical for sanitary, locks and decor brands.',
      'Using the phone’s location is optional. Pincode or city search always works.',
      'Call and WhatsApp open on the phone. Directions opens Google Maps in a new tab.',
    ],
    render: ({ dev }) => {
      const dealer = (n, t, a, d) => `<div class="card"><div class="cb" style="gap:6px"><div class="row"><b class="small">${n}</b>${pill(t)}<span class="sp"></span><span class="xs muted">${d}</span></div><span class="xs muted">${a}</span><div class="row">${btn('Call', { sm: true, icon: 'phone' })}${btn('WhatsApp', { sm: true, icon: 'whatsapp' })}${btn('Directions', { sm: true, icon: 'ext' })}</div></div></div>`;
      return WF.store({
        tab: 'Dealers',
        body: zone(`<div class="col" style="gap:16px">
          ${H(`Find a dealer ${pin(1)}`, '214 dealers and experience centres in 180 cities')}
          <div class="row nw">${field('', 'Pune', { icon: 'search', cls: 'sp', lg: true })}${btn(dev === 'm' ? '' : 'Use my location', { icon: 'loc', label: 'Use my location', lg: true })}${pin(2)}</div>
          <div class="row">${chip('All', { on: true })}${chip('Dealers')}${chip('Experience centres')}${chip('Distributors')}</div>
          <div class="row m-only">${tabs(['List', 'Map'], 'List')}</div>
          <div class="split" style="${dev === 'd' ? 'grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)' : ''}">
            <div class="col" style="gap:10px"><span class="small muted">12 near Pune</span>
              ${dealer('Shree Sanitation', 'Dealer', 'Shop 4, Baner Road, Pune 411045', '2.1 km')}
              ${dealer('Aqua Bath Studio', 'Experience centre', 'Koregaon Park, Pune 411001', '7.8 km')}
              ${dealer('Kumar Bath House', 'Dealer', 'Pimple Saudagar, Pune 411027', '6.4 km')}
              <span class="small muted">Directions open Google Maps ${pin(3)}</span>
            </div>
            <div class="d-only">${ph('Map with dealer pins', { h: 520 })}</div>
          </div></div>`, { flag: 'dealer-locator' }),
      });
    },
  });

  WF.screen({
    id: 'st-downloads', surface: 'st', group: 'Store info', title: 'Downloads',
    purpose: 'Catalogues, price lists, spec sheets, manuals and drawings in one place, which dealers and architects use constantly.',
    route: '/downloads', who: 'Shoppers, dealers, architects', data: ['product-documents', 'media'], docs: ['docs/08-modules-and-feature-flags.md', 'docs/06-data-model.md'],
    notes: [
      'Lists every document marked “show on downloads page” in the CMS. Needs the downloads feature.',
      'Some files can be limited to signed-in trade partners in Phase 2, such as a dealer price list.',
      'Large files come straight from media storage through a CDN, so they do not slow the store.',
    ],
    render: () => WF.store({
      tab: 'Home',
      body: zone(`<div class="col" style="gap:16px">
        ${H(`Downloads ${pin(1)}`, 'Catalogues, price lists, manuals and drawings')}
        ${tabs(['All', 'Catalogues', 'Price lists', 'Spec sheets', 'Manuals'], 'All')}
        ${field('', '', { ph: 'Search by product or model no.', icon: 'search' })}
        <div class="list">
          ${[['Aquaverde product catalogue 2026', 'PDF · 24 MB · updated Sep 2026'], ['Price list, October 2026', 'PDF · 1.1 MB'], ['Aria series spec sheet', 'PDF · 420 KB'], ['Nimbus WC installation manual', 'PDF · 2.3 MB']]
            .map(([t, m]) => `<div>${icon('file', 20)}<div class="sp"><b class="small">${t}</b><div class="xs muted">${m}</div></div>${btn('Download', { sm: true, icon: 'down' })}</div>`).join('')}
          ${zone(`<div style="display:flex;align-items:center;gap:10px;padding:9px 0">${icon('lock', 20)}<div class="sp"><b class="small">Dealer price list, October 2026</b><div class="xs muted">PDF · 1.4 MB · for trade partners</div></div>${btn('Log in to download', { sm: true, go: 'st-login' })}${pin(2)}</div>`, { p2: 'P2' })}
        </div>
        <p class="small muted">Files are served from storage through a CDN ${pin(3)}</p></div>`, { flag: 'downloads' }),
    }),
  });

  WF.screen({
    id: 'st-contact', surface: 'st', group: 'Store info', title: 'Contact and quote request',
    purpose: 'One form for quotes, product questions, dealership enquiries and service, prefilled with the product when opened from a product page.',
    route: '/contact?product=AV-TD-4410&type=quote', who: 'Shoppers, builders, would-be dealers', data: ['enquiries'], docs: ['docs/06-data-model.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Each submission lands in the CMS Enquiries inbox with the product attached. Needs the enquiries feature.',
      'Only the fields needed to reply, with a clear consent line, in line with India’s DPDP Act.',
      'The form is rate limited and spam checked. The shopper gets a reference number and an email copy.',
      'The grievance officer’s name and contact are shown here and in the footer, as India’s e-commerce rules require. Complaints are acknowledged within 48 hours and resolved within a month.',
    ],
    render: () => WF.store({
      tab: 'Home',
      body: zone(`<div class="co">
        ${card(`Request a quote ${pin(1)}`, `<div class="form">
          ${field('What do you need?', 'Request a quote', { sel: true, cls: 's2' })}
          <div class="row nw callout s2">${ph('', { w: 44, h: 44 })}<div class="sp"><b class="small">Sola thermostatic diverter</b><div class="mn">AV-TD-4410</div></div>${field('Quantity', '40')}</div>
          ${field('Name', 'Rakesh Mehta', { req: true })}${field('Mobile', '+91 96xxx xx771', { req: true })}
          ${field('Email', 'purchase@mehta.example')}${field('Company', 'Mehta Builders', { ph: 'Optional' })}
          ${field('City', 'Surat')}${field('Pincode', '395007')}
          ${field('Message', 'Need 40 units for a residential project, delivery by November.', { ta: true, cls: 's2' })}
          <div class="fld s2"><span class="fl">Attach BOQ or drawing</span><div class="in" style="border-style:dashed;justify-content:center">${icon('upload', 14)}<span>PDF or image, up to 10 MB</span></div></div>
          <div class="s2">${chk(true, 'Aquaverde may contact me about this enquiry.')} ${pin(2)}</div>
          <div class="s2">${btn('Send enquiry', { pri: true, lg: true })}</div>
          <div class="callout small s2">${icon('check', 14)}<span>Thanks, Rakesh. Reference <b class="mono">ENQ-3108</b>. We reply within one working day. ${pin(3)}</span></div>
        </div>`)}
        ${card('Other ways to reach us', `<div class="list small">
          <div>${icon('phone', 15)}<span>1800 000 0000 · Mon to Sat, 9:30 to 6:30</span></div>
          <div>${icon('whatsapp', 15)}<span>+91 90000 00000</span></div>
          <div>${icon('mail', 15)}<span>care@aquaverde.example</span></div>
          <div>${icon('pin', 15)}<span>Survey 112, NH 8-A, Morbi, Gujarat 363642</span></div>
          <div>${icon('user', 15)}<span>Grievance officer: Priya Shah, Director · grievance@aquaverde.example ${pin(4)}</span></div>
        </div>${btn('Find a dealer near you', { block: true, go: 'st-dealers' })}`)}
      </div>`, { flag: 'enquiries' }),
    }),
  });

  WF.screen({
    id: 'st-warranty', surface: 'st', group: 'Store info', title: 'Warranty and service', phase: 2,
    purpose: 'Register a product’s warranty and book a service visit, for brands that sell locks, fittings and sanitaryware.',
    route: '/warranty', who: 'Shoppers', data: ['warranty-registrations', 'service-requests'], docs: ['docs/08-modules-and-feature-flags.md', 'docs/17-roadmap.md'],
    notes: [
      'Phase 2, shown only when the warranty and service-requests features are on for the vendor.',
      'The warranty end date is worked out from the purchase date and the product’s warranty months. Online orders fill in automatically.',
      'Requests appear on the CMS Service requests board. Visit updates go by email, and by WhatsApp once that connector exists.',
    ],
    render: () => WF.store({
      tab: 'Account',
      body: zone(`<div class="col" style="gap:16px">
        ${H(`Warranty and service ${pin(1)}`)}
        ${tabs(['Register a product', 'Request service', 'Track a request'], 'Register a product')}
        <div class="split">
          ${card('Register your warranty', `<div class="form">
            ${field('Product or model no.', 'AV-BM-1120 · Aria single-lever basin mixer', { cls: 's2', icon: 'search' })}
            ${field('Purchase date', '18 Aug 2026', { icon: 'cal' })}<div class="fld"><span class="fl">Bought from</span><div class="col" style="gap:4px">${radio(true, 'Aquaverde online · AQV-09811')}${radio(false, 'A dealer')}</div></div>
            <div class="fld s2"><span class="fl">Invoice photo</span><div class="in" style="border-style:dashed;justify-content:center">${icon('upload', 14)}<span>Not needed for online orders</span></div></div>
            <div class="callout small s2">${icon('shield', 14)}<span>Covered until <b>18 Aug 2031</b> ${pin(2)}</span></div>
            <div class="s2">${btn('Register', { pri: true, lg: true })}</div></div>`)}
          ${card('Request a service visit', `<div class="form">
            ${field('Product', 'Aria basin mixer · registered', { sel: true, cls: 's2' })}${field('Problem', 'Leaking', { sel: true })}${field('Pincode', '411045')}
            ${field('Describe it', 'Water drips from the base when the tap is open.', { ta: true, cls: 's2' })}
            <div class="fld s2"><span class="fl">Photos or video</span><div class="in" style="border-style:dashed;justify-content:center">${icon('upload', 14)}<span>Add up to 4 files</span></div></div>
            <div class="fld s2"><span class="fl">Preferred visit</span><div class="row">${chip('Thu 8 Oct', { on: true })}${['10 to 12', '12 to 2', '2 to 4', '4 to 6'].map((s, i) => chip(s, { on: i === 0 })).join('')}</div></div>
            <div class="s2">${btn('Request a visit', { pri: true, lg: true })}</div>
            <div class="callout small s2">${icon('cal', 14)}<span><b class="mono">SR-0192</b> · visit booked Thu 8 Oct, 10 to 12. We’ll message you on the day. ${pin(3)}</span></div></div>`)}
        </div></div>`, { p2: true, flag: ['warranty', 'service-requests'] }),
    }),
  });

  WF.screen({
    id: 'st-offline', surface: 'st', group: 'Store info', title: 'Install, offline and unavailable',
    purpose: 'The app-like moments of the PWA: installing the store, using it without a connection, and what shoppers see when a store is paused.',
    route: '/offline · manifest.webmanifest', who: 'Shoppers', data: ['site-settings (name, icons, theme colour)'], docs: ['docs/13-pwa-seo-performance.md', 'docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'The service worker keeps the store’s shell and recently viewed pages, so they open without signal. Cart changes, checkout and payment always need a connection.',
      'Each vendor gets its own app name, icon and colour from their store settings. Android shows the install prompt; iPhone needs Share, then Add to Home Screen.',
      'Shown when the platform team suspends a store or the vendor turns on maintenance mode. It tells search engines to come back later rather than dropping the pages.',
    ],
    render: () => WF.store({
      tab: 'Home', noWa: true,
      body: `<div class="g c3 m1" style="align-items:start">
        ${card(`Offline ${pin(1)}`, `<div class="col" style="align-items:center;text-align:center;gap:8px;padding:10px 0">${icon('wifioff', 36)}<b>You’re offline</b><span class="small muted">Check your connection. Pages you opened recently still work.</span></div>
          <span class="sec-t">Recently viewed</span><div class="list small">${[['Aria single-lever basin mixer', '₹4,250'], ['Nimbus wall-hung WC', '₹18,450']].map(([t, p]) => `<div${go('st-product')}>${ph('', { w: 40, h: 40 })}<span class="sp">${t}</span><b>${p}</b></div>`).join('')}</div>${btn('Try again', { block: true, icon: 'refresh' })}`)}
        ${card(`Install the app ${pin(2)}`, `<div class="row nw">${ph('512 px icon', { w: 64, h: 64 })}<div class="sp"><b>Install Aquaverde</b><div class="xs muted">aquaverde.tenantecom.in</div></div></div>
          <span class="small muted">Opens like an app, loads faster and works offline for pages you have seen.</span>
          <div class="row">${btn('Install', { pri: true })}${btn('Not now', { ghost: true })}</div>
          <div class="callout xs">On iPhone: tap Share, then Add to Home Screen.</div>`)}
        ${card(`Store unavailable ${pin(3)}`, `<div class="col" style="align-items:center;text-align:center;gap:8px;padding:10px 0"><span class="sf-logo">AQUAVERDE</span><b>Our store is getting an update</b><span class="small muted">We’ll be back shortly. For urgent help call 1800 000 0000.</span></div>`)}
      </div>`,
    }),
  });
})();
