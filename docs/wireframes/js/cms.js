/* Vendor CMS: each vendor's own admin (Payload admin scoped to one tenant). Sample vendor: Aquaverde Sanitary. */
(function () {
  'use strict';
  const { icon, btn, pill, ph, field, tog, chk, radio, chip, sw, tabs, table, card, kpi, meter, bars, steps, zone, tag, pin, lines } = WF;
  const yes = icon('check', 14);
  const no = '<span class="faint">—</span>';
  const rd = '<span class="xs muted">read</span>';

  WF.surface('cms', {
    label: 'Vendor CMS',
    width: 1120,
    about: 'Each vendor’s own admin, opened after your team hands them a login. Staff manage products, orders, content and store settings for their store only. It is the same admin for every vendor: Payload’s admin with one TenantEcom theme. Use Design for the planned look and Wireframe for the annotated layout.',
  });

  WF.navs.cms = {
    logo: `${ph('', { w: 30, h: 30 })}<div><b>Aquaverde Sanitary</b><small>Store admin</small></div>`,
    search: 'Search products, orders, customers',
    top: `<span class="row nw">${btn('View store', { sm: true, icon: 'ext', go: 'st-home' })}${icon('bell', 16)}<span class="av">PS</span><span class="nowrap">Priya Shah · Owner</span></span>`,
    groups: [
      { items: [['Dashboard', 'cms-dashboard', 'home']] },
      { h: 'Catalog', items: [['Products', 'cms-products', 'box'], ['Categories', 'cms-categories', 'grid'], ['Attribute sets', 'cms-attributes', 'tag'], ['Import and export', 'cms-import', 'upload'], ['Media', 'cms-media', 'image']] },
      { h: 'Sales', items: [['Orders', 'cms-orders', 'receipt'], ['Customers', 'cms-customers', 'users'], ['Enquiries', 'cms-enquiries', 'inbox']] },
      { h: 'Marketing', items: [['Schemes and offers', 'cms-schemes', 'cal'], ['Coupons', 'cms-coupons', 'tag'], ['Offer messages', 'cms-campaigns', 'mail'], ['Abandoned carts', 'cms-abandoned', 'cart'], ['Affiliates', 'cms-affiliates', 'link'], ['Reviews', 'cms-reviews', 'star']] },
      { h: 'Content', items: [['Pages', 'cms-pages', 'file'], ['Navigation', 'cms-navigation', 'menu']] },
      { h: 'Store', items: [['Dealers', 'cms-dealers', 'pin'], ['Shipping', 'cms-shipping', 'truck'], ['Payments', 'cms-payments', 'card'], ['WhatsApp and SMS', 'cms-messaging', 'whatsapp'], ['Order updates', 'cms-notifications', 'bell'], ['Settings', 'cms-settings', 'gear'], ['Staff and roles', 'cms-staff', 'users']] },
      { h: 'Insights', items: [['Reports', 'cms-reports', 'chart']] },
      { h: 'Modules', zone: { p2: 'P2' }, items: [['Service requests', 'cms-service', 'wrench'], ['Trade accounts', 'cms-trade', 'store'], ['Loyalty points', '', 'star', { off: true, tag: '<span class="xs faint">off</span>' }]] },
    ],
    foot: `<div class="callout xs" style="margin-top:14px;flex-direction:column;gap:6px">${meter('Products', 1240, 2000)}<span class="muted">Growth plan</span></div>`,
  };

  const shell = (id, cfg) => WF.admin(Object.assign({ surface: 'cms', id }, cfg));
  const payBanner = (p) => `<div class="banner">${icon('bell', 15)}<span class="sp"><b>Razorpay webhooks are failing since 10:42.</b> Paid orders are being checked every 15 minutes until this is fixed.${p ? pin(p) : ''}</span>${btn('Fix in Payments', { sm: true, go: 'cms-payments' })}</div>`;
  const thumb = (t, sub, w = 36) => `<div class="row nw">${ph('', { w, h: w })}<div><b>${t}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>`;
  const cell = (v, r) => `<span class="in" style="min-height:28px;padding:3px 8px${r ? ';justify-content:flex-end' : ''}">${v}</span>`;
  const dl = (pairs) => `<div class="list small">${pairs.map(([k, v]) => `<div><span class="muted sp">${k}</span><span class="r">${v}</span></div>`).join('')}</div>`;

  /* ---------------- Dashboard ---------------- */
  WF.screen({
    id: 'cms-dashboard', surface: 'cms', group: 'Home', title: 'Store dashboard',
    purpose: 'What needs doing today in this store: orders to ship, enquiries to answer, stock running low, and how sales are going.',
    route: '/admin', who: 'All vendor staff; cards depend on role', data: ['orders', 'enquiries', 'variants', 'site-settings', 'schemes', 'reviews', 'affiliates', 'carts'], docs: ['docs/05-auth-and-roles.md', 'docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Cards follow the person’s role. A catalog editor sees stock and products but no sales figures; an order manager sees orders and enquiries.',
      'The launch checklist follows the new vendor checklist and disappears once everything is done.',
      'Connector problems show as a banner on every CMS page until fixed, because they can stop orders being marked paid.',
      'Order updates sent today on WhatsApp, SMS and email. A WhatsApp message that fails is sent again by SMS automatically.',
      'Growth at a glance: the live scheme and the next one, reviews waiting for approval, affiliate applications and commission, and carts recovered by reminders. Each row opens its Marketing screen; rows for switched-off features don’t show.',
    ],
    render: () => shell('cms-dashboard', {
      crumbs: [['Dashboard']], banner: payBanner(3),
      title: 'Good morning, Priya', sub: 'Friday, 2 October 2026',
      actions: btn('Import CSV', { icon: 'upload', go: 'cms-import' }) + btn('Add product', { pri: true, icon: 'plus', go: 'cms-product-edit' }),
      body: `
        ${card(`Launch checklist · 7 of 8 done ${pin(2)}`, `<div class="g c3 small" style="gap:8px 16px">
          ${[['Store name and logo', 1], ['GST details', 1], ['Razorpay connected', 1], ['Shipping zones', 1], ['Products imported', 1], ['WhatsApp templates approved', 1], ['SMS sender approved on DLT', 1], ['Warranty policy page', 0]]
            .map(([t, d]) => `<span class="row nw">${chk(!!d)}<span class="${d ? 'muted' : 'b6'}">${t}</span>${d ? '' : btn('Open pages', { sm: true, go: 'cms-pages' })}</span>`).join('')}
        </div>`)}
        <div class="g c5">
          ${kpi('Orders today', '23', '9 still to ship', { go: 'cms-orders' })}
          ${kpi('Sales today', '₹1,12,400', 'incl. GST', { pin: 1 })}
          ${kpi('To ship', '9', 'oldest 2 days', { go: 'cms-orders' })}
          ${kpi('New enquiries', '5', '2 quote requests', { go: 'cms-enquiries' })}
          ${kpi('Low stock', '12', 'variants', { go: 'cms-products' })}
        </div>
        <div class="g c21">
          ${card('Sales, last 14 days', bars([96, 104, 88, 121, 134, 98, 92, 110, 126, 141, 118, 102, 131, 112], { max: 150, yLabels: ['₹1.5 L', '₹75 K', '0'], xLabels: ['19 Sep', '2 Oct'], h: 130 }))}
          <div class="col">${card('New enquiries', `<div class="list small">
            ${[['Quote request', 'Mehta Builders, Surat · 40 × Sola diverter', '2 h'], ['Product question', 'Rough-in size for Nimbus WC?', '5 h'], ['Dealership', 'Wants to stock Aquaverde in Nagpur', 'Yesterday']]
              .map(([t, s, w]) => `<div data-go="cms-enquiries"><div class="col sp" style="gap:0"><b>${t}</b><span class="muted">${s}</span></div><span class="faint xs nowrap">${w}</span></div>`).join('')}
          </div>`, { act: btn('All', { sm: true, ghost: true, go: 'cms-enquiries' }) })}
          ${card('Order updates today', `<div class="list small">
            <div>${icon('whatsapp', 15)}<span class="sp">WhatsApp</span><b>86 sent</b><span class="xs muted">2 failed, sent by SMS</span></div>
            <div>${icon('chat', 15)}<span class="sp">SMS</span><b>9 sent</b></div>
            <div>${icon('mail', 15)}<span class="sp">Email</span><b>41 sent</b></div>
          </div>`, { pin: 4, act: btn('Settings', { sm: true, ghost: true, go: 'cms-notifications' }) })}</div>
        </div>
        ${card(`Offers and growth ${pin(5)}`, `<div class="g c4 small" style="gap:10px 18px">
          <div data-go="cms-schemes"><div class="fl">Live scheme</div><b>Rainline launch</b><div class="xs muted">41 orders · ₹16,400 off · ends 31 Oct</div><div class="xs">Next: Diwali, starts 1 Nov</div></div>
          <div data-go="cms-reviews"><div class="fl">Reviews to approve</div><b>6</b><div class="xs muted">oldest 1 day · average this month 4.5</div></div>
          <div data-go="cms-affiliates"><div class="fl">Affiliates</div><b>2 applications</b><div class="xs muted">₹6,420 commission pending · ₹3,150 approved</div></div>
          <div data-go="cms-abandoned"><div class="fl">Abandoned carts today</div><b>14 · 3 recovered</b><div class="xs muted">₹31,280 recovered this week</div></div>
        </div>`)}
        <div class="g c2">
          ${card('Orders to ship', table(['Order', 'Customer', '>Total', 'Payment'], [
            ['<span class="mono">AQV-10482</span>', 'Rahul Kulkarni', '₹23,640.00', pill('Paid', 's-ok')],
            ['<span class="mono">AQV-10481</span>', 'Sneha Reddy', '₹4,299.00', pill('COD', 's-warn')],
            ['<span class="mono">AQV-10479</span>', 'Vikram Singh', '₹31,140.00', pill('Paid', 's-ok')],
          ], { go: 'cms-order' }), { flat: true })}
          ${card('Low stock', table(['Variant', '>In stock', '>Alert at'], [
            ['Rainline overhead shower · Matt black', '4', '10'], ['Quadra towel rail · Chrome', '0', '5'], ['Aria basin mixer · Brushed gold', '18', '20'],
          ], { go: 'cms-product-edit' }), { flat: true })}
        </div>`,
    }),
  });

  /* ---------------- Catalog ---------------- */
  const prow = (title, model, cat, vars, price, stock, status, upd) => [thumb(title, `<span class="mono">${model}</span>`), cat, vars, price, stock, status, upd];
  WF.screen({
    id: 'cms-products', surface: 'cms', group: 'Catalog', title: 'Products',
    purpose: 'The vendor’s whole catalogue: find a product by name, SKU or model number, see price and stock, and act on many at once.',
    route: '/admin/collections/products', who: 'Owner, manager, catalog editor; others read-only', data: ['products', 'variants', 'categories'], docs: ['docs/12-catalog-and-import.md', 'docs/06-data-model.md'],
    notes: [
      'Search matches model numbers and SKUs exactly first, which is how dealers and fitters look products up.',
      'Price shows the range across finishes. Amounts are typed in rupees and stored as whole paise.',
      'Enquire-only products show “Request a quote” instead of a price on the store. Needs the enquire-only feature.',
      'The plan’s product limit is shown here and blocks new products when it is reached.',
    ],
    render: () => shell('cms-products', {
      crumbs: [['Catalog'], ['Products']], title: 'Products', sub: `1,240 products ${pin(4)} · 2,000 allowed on Growth`,
      actions: btn('Import', { icon: 'upload', go: 'cms-import' }) + btn('Export', { icon: 'down' }) + btn('Add product', { pri: true, icon: 'plus', go: 'cms-product-edit' }),
      body: `
        ${tabs([['All', null, '1,240'], ['Active', null, '1,198'], ['Draft', null, 31], ['Archived', null, 11]], 'All')}
        <div class="row">${field('', '', { ph: 'Search title, SKU or model no.', icon: 'search', cls: 'sp' })}${pin(1)}${field('', 'Category: all', { sel: true })}${field('', 'Stock: all', { sel: true })}${btn('More filters', { icon: 'filter' })}</div>
        <div class="row small" style="background:var(--fill);border-radius:6px;padding:6px 10px">${chk(true)}<b>2 selected</b>${btn('Publish', { sm: true })}${btn('Archive', { sm: true })}${btn('Change category', { sm: true })}${btn('Export selected', { sm: true })}</div>
        ${table(['Product', 'Category', 'Variants', `>Price ${pin(2)}`, '>In stock', 'Status', 'Updated'], [
          prow('Aria single-lever basin mixer', 'AV-BM-1120', 'Basin mixers', '3 finishes', '₹4,250 – ₹5,890', '146', pill('Active', 's-ok'), 'Today 09:12'),
          prow('Nimbus wall-hung WC with soft-close seat', 'AV-WH-2041', 'Wall-hung WCs', '1', '₹18,450', '22', pill('Active', 's-ok'), '30 Sep'),
          prow('Rainline 200 mm overhead shower', 'AV-OS-3200', 'Overhead showers', '2 finishes', '₹2,690', '<b>4</b><span class="sub">Low</span>', pill('Active', 's-ok'), '28 Sep'),
          prow('Sola thermostatic diverter', 'AV-TD-4410', 'Diverters', '1', `${pill('Enquire only', 'dash')}${pin(3)}`, '60', pill('Active', 's-ok'), '27 Sep'),
          prow('Edge countertop basin 600', 'AV-CB-5600', 'Wash basins', '1', '₹7,990', '31', pill('Draft', 's-off'), 'Yesterday'),
          prow('Quadra towel rail 600', 'AV-TR-6060', 'Accessories', '2 finishes', '₹1,890', '<b>0</b><span class="sub">Out of stock</span>', pill('Active', 's-ok'), '21 Sep'),
        ], { go: 'cms-product-edit', check: true })}
        <div class="row small muted"><span>1–25 of 1,240</span><span class="sp"></span>${btn('Previous', { sm: true })}${btn('Next', { sm: true })}</div>`,
    }),
  });

  WF.screen({
    id: 'cms-product-edit', surface: 'cms', group: 'Catalog', title: 'Product editor',
    purpose: 'Everything about one product: details, photos and videos, specifications, finishes with their own price and stock, GST, documents and search settings.',
    route: '/admin/collections/products/:id', who: 'Owner, manager, catalog editor', data: ['products', 'variants', 'attribute-sets', 'product-documents', 'media', 'tax-rates'], docs: ['docs/12-catalog-and-import.md', 'docs/06-data-model.md', 'docs/11-orders-payments-gst.md'],
    notes: [
      'The category’s attribute set decides which specification fields appear and which become filters on the store. A lock or a kurta gets different fields with no code change.',
      'Each finish is a variant with its own SKU, price, MRP and stock. Prices are typed in rupees and saved as whole paise.',
      'HSN code and GST rate are required for the GST invoice. The tax split is always worked out on the server.',
      'Documents can be public, or limited to signed-in trade partners in Phase 2 (for example a dealer price list). CAD files are not offered.',
      '“How shoppers buy” switches a product to “Request a quote”, useful for project items. Needs the enquire-only feature.',
      'Every save keeps a version. Publish makes the draft live; older versions can be compared and restored.',
      'Legal details are required before a product can go live: India’s Legal Metrology and e-commerce rules make the product page show what it is, the country of origin, net quantity, who made, packed or imported it, and consumer care. Name, address and consumer care come from Store settings.',
      'Offer prices are not typed here. A launch price or festival discount is a scheme, so the product’s own price and MRP stay untouched and come back by themselves when the scheme ends. The rating comes from published reviews and can’t be edited.',
    ],
    render: () => shell('cms-product-edit', {
      nav: 'cms-products', crumbs: [['Catalog'], ['Products', 'cms-products'], ['Aria single-lever basin mixer']],
      title: `Aria single-lever basin mixer ${pill('Published', 's-ok')} ${pill('Unsaved changes', 's-warn')}`, sub: 'Model AV-BM-1120 · last saved by Neha Patel at 09:12',
      actions: btn('Preview', { icon: 'ext', go: 'st-product' }) + btn('Save draft') + btn('Publish changes', { pri: true }),
      body: `
        ${zone(tabs(['English', 'हिन्दी', 'ગુજરાતી'], 'English'), { p2: 'Multilingual, P2' })}
        <div class="g c31">
          <div class="col">
            ${card('Basics', `<div class="form">
              ${field('Title', 'Aria single-lever basin mixer', { req: true })}${field('Model number', '<span class="mono">AV-BM-1120</span>', { req: true })}
              ${field('Brand', 'Aquaverde', { sel: true })}${field('Main category', 'Faucets › Basin mixers', { sel: true, req: true, help: 'Decides the specification fields below' })}
              <div class="fld s2"><span class="fl">Also show in</span><div class="row">${chip('Faucets › Tall basin mixers', { x: true })}${chip('+ Add category')}</div></div>
              ${field('Short description', 'Solid brass single-lever mixer for counter-top and wall-hung basins.', { cls: 's2' })}
              <div class="fld s2"><span class="fl">Highlights</span><div class="col" style="gap:6px">${['Solid brass body, lead-free', '35 mm ceramic disc cartridge', 'Aerator limits flow to 6 litres a minute'].map((h) => `<span class="in">${icon('drag', 14)}${h}</span>`).join('')}<span class="small muted">${icon('plus', 12)} Add highlight</span></div></div>
              <div class="fld s2"><span class="fl">Description</span><div class="in ta" style="flex-direction:column;align-items:stretch;gap:8px"><div class="row" style="gap:4px">${['B', 'I', 'List', 'Link', 'Table'].map((t) => btn(t, { sm: true, ghost: true })).join('')}</div>${lines(3, 70)}</div></div>
            </div>`)}
            ${card('Photos and videos', `
              <div class="row">${ph('Main', { w: 84, h: 84 })}${[1, 2, 3, 4, 5].map(() => ph('', { w: 84, h: 84 })).join('')}<div class="ph" style="width:84px;height:84px;border-style:dashed;background:var(--paper)"><span>+ Add</span></div></div>
              <span class="help">The first photo shows in listings. JPG, PNG or WebP; resized automatically for phones.</span>
              ${zone(`<div class="list small" style="padding-top:6px"><div>${icon('play', 14)}<span class="sp">Installation video · youtube.com/watch?v=…</span>${pill('Installation')}${btn('', { icon: 'more', sm: true, label: 'More' })}</div></div>${btn('Add video', { sm: true, icon: 'plus' })}`, { flag: 'product-videos' })}`)}
            ${card(`Specifications · from attribute set “Faucets” ${pin(1)}`, `
              <span class="sec-t">Technical</span>
              <div class="form3">${field('Material', 'Brass', { sel: true, req: true })}${field('Mounting', 'Deck mounted', { sel: true, req: true })}${field('Cartridge', '35 mm ceramic disc', { sel: true })}${field('Flow rate', '6', { suffix: 'LPM' })}${field('Working pressure', '0.5 to 5', { suffix: 'bar' })}${field('Warranty', '5', { suffix: 'years' })}</div>
              <span class="sec-t">Dimensions</span>
              <div class="form3">${field('Spout reach', '120', { suffix: 'mm' })}${field('Height', '165', { suffix: 'mm' })}${field('Tap hole', '35', { suffix: 'mm' })}</div>`, { act: btn('Edit attribute set', { sm: true, ghost: true, go: 'cms-attributes' }) })}
            ${card(`Finishes, prices and stock ${pin(2)}`, `
              <div class="row small"><span class="muted">Variant option:</span><b>Finish</b>${chip(sw('chrome') + 'Chrome')}${chip(sw('black') + 'Matt black')}${chip(sw('gold') + 'Brushed gold')}${btn('Edit options', { sm: true, ghost: true })}</div>
              ${table(['Finish', 'SKU', '>Price incl. GST (₹)', '>MRP (₹)', '>In stock', '>Reserved', 'Status'], [
                [`<span class="row nw">${sw('chrome')}Chrome</span>`, '<span class="mono xs">AV-BM-1120-CP</span>', cell('4,250.00', 1), cell('5,600.00', 1), cell('86', 1), '3', pill('Active', 's-ok')],
                [`<span class="row nw">${sw('black')}Matt black</span>`, '<span class="mono xs">AV-BM-1120-MB</span>', cell('5,190.00', 1), cell('6,900.00', 1), cell('42', 1), '1', pill('Active', 's-ok')],
                [`<span class="row nw">${sw('gold')}Brushed gold</span>`, '<span class="mono xs">AV-BM-1120-BG</span>', cell('5,890.00', 1), cell('7,800.00', 1), cell('18', 1), '0', pill('Active', 's-ok')],
              ], { go: null })}
              <div class="row small">${field('Alert me below', '20', { suffix: 'units' })}${tog(false, 'Allow orders when out of stock')}</div>`)}
            ${card(`Price and GST ${pin(3)}`, `
              <div class="form3">${field('GST rate', 'GST 18%', { sel: true, req: true })}${field('HSN code', '<span class="mono">8481</span>', { req: true })}<div class="fld"><span class="fl">Prices</span>${tog(true, 'Include GST')}</div></div>
              <div class="callout small">${icon('receipt', 14)}<span>For ₹4,250.00 the taxable value is ₹3,601.69 and GST is ₹648.31. It is split into CGST and SGST, or IGST, at checkout from the delivery state.</span></div>`)}
            ${card(`Documents ${pin(4)}`, table(['Title', 'Type', 'File', 'Who can see'], [
              ['Aria spec sheet', 'Spec sheet', 'PDF · 420 KB', 'Everyone'],
              ['Installation manual', 'Installation manual', 'PDF · 1.8 MB', 'Everyone'],
              ['Dealer price list, Aria series', 'Price list', 'PDF · 180 KB', `Trade partners ${tag.p2('P2')}`],
            ], { go: null }) + `<div style="padding:8px 14px">${btn('Attach document', { sm: true, icon: 'plus' })}</div>`, { flat: true })}
            ${card('Spare parts and related products', `
              ${zone(`<div class="fld"><span class="fl">Spare parts</span><div class="row">${chip('<span class="mono">AV-SP-0035</span> 35 mm cartridge', { x: true })}${chip('<span class="mono">AV-SP-0110</span> Aerator M24', { x: true })}${chip('+ Add')}</div></div>`, { p2: 'P2', flag: 'spare-parts' })}
              <div class="fld"><span class="fl">Goes well with</span><div class="row">${chip('Aria tall basin mixer', { x: true })}${chip('Quadra towel rail 600', { x: true })}${chip('+ Add')}</div></div>`)}
            ${card('Search engines', `<div class="form">${field('Address', '<span class="mono">/products/aria-single-lever-basin-mixer</span>', { cls: 's2' })}${field('Page title', 'Aria single-lever basin mixer · Aquaverde')}${field('Search keywords', '1120, basin tap, wash basin mixer')}${field('Description', 'Solid brass single-lever basin mixer with 35 mm cartridge and 5-year warranty.', { cls: 's2', ta: true })}</div>`)}
          </div>
          <div class="col">
            ${card('Status', `<div class="col" style="gap:6px">${radio(true, 'Active')}${radio(false, 'Draft')}${radio(false, 'Archived')}</div><span class="help">Live since 14 Sep · version 14</span>`)}
            ${zone(card(`How shoppers buy ${pin(5)}`, `<div class="col" style="gap:6px">${radio(true, 'Buy online')}${radio(false, 'Request a quote only')}${radio(false, 'Both')}</div><div class="form">${field('Min. quantity', '1')}${field('Max. quantity', '10')}</div>`), { flag: 'enquire-only-products' })}
            ${card(`Legal details ${pin(7)}`, `<div class="form">${field('Generic name', 'Basin mixer', { req: true })}${field('Country of origin', 'India', { sel: true, req: true })}${field('Net quantity', '1 piece', { req: true })}${field('Made by', 'Manufacturer', { sel: true })}${field('Name and address', 'Aquaverde Ceramics Pvt Ltd, Morbi, Gujarat 363642', { help: 'From Store settings' })}${field('Consumer care', '1800 000 0000 · care@aquaverde.example', { help: 'From Store settings' })}</div>`)}
            ${card('Warranty and shipping', `${field('Warranty', '60', { suffix: 'months' })}${field('Weight', '1,450', { suffix: 'g' })}${field('Box size', '220 × 180 × 90', { suffix: 'mm' })}`)}
            ${card('Show on store', `${tog(true, 'Featured in Bestsellers')}${tog(false, 'New arrival badge')}`)}
            ${card(`Offers and reviews ${pin(8)}`, `<div class="list small"><div data-go="cms-schemes">${icon('cal', 14)}<span class="sp">Diwali offer from 1 Nov</span><span class="xs muted">10% off</span></div><div data-go="cms-reviews">${icon('star', 14)}<span class="sp">4.6 from 38 reviews</span><span class="xs muted">2 waiting</span></div></div><span class="help">Offer prices come from Schemes and ratings from Reviews.</span>`)}
            ${card(`Versions ${pin(6)}`, `<div class="list small"><div><span class="sp"><b>v14</b> Neha · today 09:12</span>${pill('Current', 's-ok')}</div><div><span class="sp">v13 Neha · 28 Sep</span>${btn('Restore', { sm: true, ghost: true })}</div><div><span class="sp">v12 Arjun · 14 Sep</span>${btn('Restore', { sm: true, ghost: true })}</div></div>${btn('Compare versions', { sm: true })}`)}
          </div>
        </div>`,
    }),
  });

  WF.screen({
    id: 'cms-categories', surface: 'cms', group: 'Catalog', title: 'Categories',
    purpose: 'The category tree shoppers browse, and which attribute set each category uses.',
    route: '/admin/collections/categories', who: 'Owner, manager, catalog editor', data: ['categories', 'attribute-sets', 'redirects'], docs: ['docs/12-catalog-and-import.md', 'docs/06-data-model.md'],
    notes: [
      'Each category points to one attribute set. Products in it get those specification fields, and the store’s filters for the category come from the same set.',
      'Changing a slug changes the store address. The old address should redirect to the new one so links and search rankings keep working.',
      'Drag to reorder or nest. The order here is the order in menus and category tiles.',
    ],
    render: () => {
      const node = (t, n, depth, on) => `<div class="row nw" style="padding:6px 8px;margin-left:${depth * 18}px;border-radius:5px;${on ? 'background:var(--fill);box-shadow:inset 0 0 0 1px var(--wire)' : ''}">${icon('drag', 14)}${depth === 0 ? icon('chevd', 12) : ''}<span class="sp ${on ? 'b6' : ''}">${t}</span><span class="mono xs faint">${n}</span></div>`;
      return shell('cms-categories', {
        crumbs: [['Catalog'], ['Categories']], title: 'Categories', sub: '23 categories',
        actions: btn('Add category', { pri: true, icon: 'plus' }),
        body: `<div class="g c12">
          ${card(`Tree ${pin(3)}`, `<div class="col small" style="gap:0">
            ${node('Faucets', 104, 0)}${node('Basin mixers', 64, 1, true)}${node('Wall mixers', 22, 1)}${node('Kitchen sink mixers', 18, 1)}
            ${node('Showers', 65, 0)}${node('Overhead showers', 31, 1)}${node('Hand showers', 26, 1)}${node('Shower panels', 8, 1)}
            ${node('Sanitaryware', 98, 0)}${node('Wall-hung WCs', 40, 1)}${node('Wash basins', 52, 1)}${node('Urinals', 6, 1)}
            ${node('Accessories', 44, 0)}${node('Spare parts', 120, 0)}
          </div>`)}
          ${card('Basin mixers', `<div class="form">
            ${field('Name', 'Basin mixers', { req: true })}${field('Parent', 'Faucets', { sel: true })}
            ${field('Slug', '<span class="mono">basin-mixers</span>', { pin: 2, help: 'Store address: /c/faucets/basin-mixers' })}${field('Attribute set', 'Faucets', { sel: true, req: true, pin: 1, help: 'Specification fields and filters for products here' })}
            <div class="fld"><span class="fl">Tile image</span>${ph('Square image', { h: 110 })}</div><div class="fld"><span class="fl">Banner</span>${ph('Wide banner, 1600 × 400', { h: 110 })}</div>
            ${field('Description', 'Single-lever and twin-handle mixers for counter-top and wall-hung basins.', { ta: true, cls: 's2' })}
            <div class="fld"><span class="fl">Show on store</span>${tog(true, 'Visible')}</div>${field('Sort order', '1')}
            ${field('Page title', 'Basin mixers · Aquaverde')}${field('Meta description', '64 basin mixers in chrome, matt black and brushed gold.')}
          </div><div class="row">${btn('Save', { pri: true })}${btn('View on store', { icon: 'ext', go: 'st-category' })}</div>`)}
        </div>`,
      });
    },
  });

  WF.screen({
    id: 'cms-attributes', surface: 'cms', group: 'Catalog', title: 'Attribute sets',
    purpose: 'Define the specification fields for each kind of product: their type, unit, and whether they filter, create finishes or appear in comparisons.',
    route: '/admin/collections/attribute-sets/:id', who: 'Owner, manager, catalog editor', data: ['attribute-sets'], docs: ['docs/12-catalog-and-import.md', 'docs/06-data-model.md'],
    notes: [
      '“Filter” adds the attribute to the category’s filters on the store, with counts.',
      '“Finish option” makes it a variant option, so each value becomes its own SKU with price and stock (finish, colour, size).',
      'The same tool covers every industry without code. Locks use lock type, door thickness and number of keys; clothing uses size, colour, fabric and fit.',
    ],
    render: () => {
      const C = (b) => (b ? chk(true) : chk(false));
      return shell('cms-attributes', {
        crumbs: [['Catalog'], ['Attribute sets'], ['Faucets']], title: 'Attribute sets',
        actions: btn('New attribute set', { icon: 'plus' }),
        body: `<div class="g" style="grid-template-columns:230px minmax(0,1fr)">
          ${card('Sets', `<div class="list small">${[['Faucets', '9 fields · 6 categories', true], ['WCs and toilets', '12 fields · 3 categories'], ['Showers', '8 fields · 3 categories'], ['Wash basins', '9 fields · 2 categories'], ['Accessories', '5 fields · 4 categories']]
            .map(([t, s, on]) => `<div style="${on ? 'background:var(--fill);margin:0 -8px;padding:9px 8px;border-radius:5px' : ''}"><div class="col" style="gap:0"><b>${t}</b><span class="muted xs">${s}</span></div></div>`).join('')}</div>`)}
          <div class="col">
            ${card('Faucets', table(['Label', 'Code', 'Type', 'Unit', `Filter ${pin(1)}`, `Finish option ${pin(2)}`, `Compare ${tag.p2('P2')}`, 'Required', 'Group'], [
              ['Finish', '<span class="mono xs">finish</span>', 'Select, swatches', no, C(1), C(1), C(1), C(1), 'Appearance'],
              ['Material', '<span class="mono xs">material</span>', 'Select', no, C(1), C(0), C(1), C(1), 'Material'],
              ['Mounting', '<span class="mono xs">mounting</span>', 'Select', no, C(1), C(0), C(1), C(1), 'Technical'],
              ['Cartridge', '<span class="mono xs">cartridge</span>', 'Select', 'mm', C(1), C(0), C(1), C(0), 'Technical'],
              ['Flow rate', '<span class="mono xs">flow_rate</span>', 'Number', 'LPM', C(1), C(0), C(1), C(0), 'Technical'],
              ['Working pressure', '<span class="mono xs">pressure</span>', 'Text', 'bar', C(0), C(0), C(1), C(0), 'Technical'],
              ['Spout reach', '<span class="mono xs">spout_reach</span>', 'Number', 'mm', C(0), C(0), C(1), C(0), 'Dimensions'],
              ['Height', '<span class="mono xs">height</span>', 'Number', 'mm', C(0), C(0), C(1), C(0), 'Dimensions'],
              ['Warranty', '<span class="mono xs">warranty_years</span>', 'Number', 'years', C(1), C(0), C(1), C(0), 'General'],
            ], { go: null }), { flat: true, act: btn('Add field', { sm: true, icon: 'plus' }) })}
            <div class="g c2">
              ${card('Options for Finish', `<div class="list small">${[['chrome', 'Chrome', 'chrome'], ['black', 'Matt black', 'matt-black'], ['gold', 'Brushed gold', 'brushed-gold'], ['gun', 'Gun metal', 'gun-metal']]
                .map(([k, l, v]) => `<div>${icon('drag', 14)}${sw(k)}<span class="sp">${l}</span><span class="mono xs faint">${v}</span></div>`).join('')}</div><span class="small muted">${icon('plus', 12)} Add option · swatch colour or photo</span>`)}
              <div class="callout small">${icon('layers', 14)}<span><b>Other industries, same screen ${pin(3)}</b><br>Locks: lock type, door thickness (mm), key type, number of keys.<br>Clothing: size, colour, fabric, fit, sleeve; size and colour as options.</span></div>
            </div>
          </div>
        </div>`,
      });
    },
  });

  WF.screen({
    id: 'cms-import', surface: 'cms', group: 'Catalog', title: 'CSV import',
    purpose: 'Bring in or update hundreds of products from a spreadsheet, with a full check before anything changes.',
    route: '/admin/import', who: 'Owner, manager, catalog editor', data: ['import-jobs', 'products', 'variants', 'categories'], docs: ['docs/12-catalog-and-import.md'],
    notes: [
      'A check run always comes first. Nothing in the store changes until staff confirm the import.',
      'Imports run as a background job, so a 5,000-row file does not time out. Staff get an email when it finishes.',
      'Errors give the row number, the column and what to do, in plain words. The full list downloads as a CSV to fix and upload again.',
      'Rows are matched on SKU: an existing SKU updates, a new SKU creates. The same flow handles stock and price updates and dealer lists.',
    ],
    render: () => shell('cms-import', {
      crumbs: [['Catalog'], ['Import and export']], title: 'Import products', sub: 'aquaverde-products-oct.csv · uploaded by Neha Patel at 09:30',
      actions: btn('Cancel'),
      body: `
        ${steps(['Upload file', 'Match columns', 'Check', 'Import'], 2)}
        <div class="g c31">
          <div class="col">
            <div class="g c4">${kpi('Rows in file', '1,180')}${kpi('New products', '236')}${kpi('Updates', '926', 'matched on SKU', { pin: 4 })}${kpi('Rows with errors', '18', 'will be skipped')}</div>
            <div class="callout">${icon('check', 15)}<span class="sp"><b>Check finished. Nothing has changed yet.</b> ${pin(1)} 1,162 rows are ready. Fix the 18 rows below, or import the ready rows now.</span></div>
            ${card(`Rows with errors ${pin(3)}`, table(['Row', 'Column', 'What to fix', 'Value'], [
              ['14', '<span class="mono xs">hsn_code</span>', 'HSN code is required for GST invoices.', no],
              ['87', '<span class="mono xs">price</span>', 'Price must be a number in rupees, like 4250 or 4250.50.', '<span class="mono xs">4,250/-</span>'],
              ['203', '<span class="mono xs">category</span>', 'Category “Basin Mixer” not found. Did you mean “Basin mixers”?', '<span class="mono xs">Basin Mixer</span>'],
              ['311', '<span class="mono xs">finish</span>', '“Gun Metal Grey” is not a Finish option. Add it to the Faucets set or change the row.', '<span class="mono xs">Gun Metal Grey</span>'],
              ['512', '<span class="mono xs">sku</span>', 'SKU AV-BM-1120-CP appears twice in this file.', '<span class="mono xs">AV-BM-1120-CP</span>'],
            ], { go: null }) + `<div class="row small muted" style="padding:8px 14px">Showing 5 of 18</div>`, { flat: true, act: btn('Download error report', { sm: true, icon: 'down' }) })}
            <div class="row">${btn('Upload a fixed file', { icon: 'upload' })}<span class="sp"></span>${btn('Import 1,162 ready rows', { pri: true, lg: true })}</div>
            <p class="small muted">${icon('mail', 13)} Runs in the background. You’ll get an email when it finishes. ${pin(2)}</p>
          </div>
          <div class="col">
            ${card('Import type', `<div class="col" style="gap:6px">${radio(true, 'Products: create and update')}${radio(false, 'Stock and prices only')}${radio(false, 'Dealers')}</div>`)}
            ${card('Templates', `<div class="list small">${['Products template', 'Stock and price template', 'Dealers template'].map((t) => `<div>${icon('file', 14)}<span class="sp">${t}</span>${icon('down', 14)}</div>`).join('')}</div>`)}
            ${card('Recent imports', `<div class="list small">
              <div><div class="col sp" style="gap:0"><b>stock-29-sep.csv</b><span class="muted xs">Stock and prices · 1,240 rows</span></div>${pill('Done', 's-ok')}</div>
              <div><div class="col sp" style="gap:0"><b>dealers-west.csv</b><span class="muted xs">Dealers · 214 rows</span></div>${pill('Done', 's-ok')}</div>
              <div><div class="col sp" style="gap:0"><b>launch-catalogue.csv</b><span class="muted xs">Products · 1,004 rows, 3 skipped</span></div>${pill('Done', 's-ok')}</div>
            </div>`)}
          </div>
        </div>`,
    }),
  });

  WF.screen({
    id: 'cms-media', surface: 'cms', group: 'Catalog', title: 'Media library',
    purpose: 'All photos, documents and videos the store uses, with alt text and where each file is used.',
    route: '/admin/collections/media', who: 'Owner, manager, catalog and content editors', data: ['media'], docs: ['docs/13-pwa-seo-performance.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Alt text is required on images so the store stays accessible and readable by search engines.',
      'Uploads are resized into phone and desktop sizes in modern formats automatically, which keeps product pages fast.',
      'Storage counts toward the plan limit.',
    ],
    render: () => shell('cms-media', {
      crumbs: [['Catalog'], ['Media']], title: 'Media', sub: '3,912 files',
      actions: btn('Upload', { pri: true, icon: 'upload' }),
      body: `
        <div class="row">${tabs(['All', 'Images', 'Documents', 'Videos'], 'All')}<span class="sp"></span>${field('', '', { ph: 'Search file name or alt text', icon: 'search' })}<div style="width:220px">${meter(`Storage ${pin(3)}`, 7.8, 20, { unit: 'GB', fmt: (v) => v })}</div></div>
        <div class="g c31">
          <div class="g c5">
            ${['aria-mb-front.webp', 'aria-mb-side.webp', 'aria-cp-front.webp', 'nimbus-wc-hero.webp', 'rainline-200.webp', 'hero-slide-1.webp', 'hero-slide-1-mobile.webp', 'quadra-rail.webp', 'aria-spec-sheet.pdf', 'aria-install.pdf', 'catalogue-2026.pdf', 'aria-warranty-card.pdf', 'edge-basin.webp', 'matt-black-banner.webp', 'factory-morbi.webp']
              .map((f, i) => `<div class="col" style="gap:4px">${f.endsWith('.webp') ? ph('', { ar: '1/1', cls: i === 0 ? '' : '' }) : `<div class="ph" style="aspect-ratio:1/1;background:var(--fill)"><span>${f.split('.').pop().toUpperCase()}</span></div>`}<span class="xs mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${i === 1 ? 'font-weight:600' : ''}">${f}</span></div>`).join('')}
          </div>
          ${card('aria-mb-side.webp', `${ph('Preview', { ar: '1/1' })}
            ${field('Alt text', 'Aria basin mixer in matt black, side view', { req: true, pin: 1 })}
            ${dl([['Type', 'WebP · 182 KB'], ['Size', '1600 × 1600'], [`Versions ${pin(2)}`, '5 sizes made'], ['Used in', '2 products']])}
            <div class="row">${btn('Replace', { sm: true })}${btn('Delete', { sm: true, danger: true })}</div>`)}
        </div>`,
    }),
  });

  /* ---------------- Sales ---------------- */
  WF.screen({
    id: 'cms-orders', surface: 'cms', group: 'Sales', title: 'Orders',
    purpose: 'Every order in the store, grouped by what needs doing next: confirm, pack, ship, handle returns.',
    route: '/admin/collections/orders', who: 'Owner, manager, order manager; support read-only', data: ['orders', 'transactions', 'shipments'], docs: ['docs/11-orders-payments-gst.md'],
    notes: [
      'Order, payment and delivery have separate statuses, so “paid but not shipped” and “shipped, COD not collected” are both clear at a glance.',
      'Cash on delivery orders are confirmed straight away with payment still to collect. The COD fee is part of the total.',
      'Invoices download in bulk as PDFs, and the list exports as CSV for accounts.',
      'Marking parcels packed, shipped, out for delivery or delivered, one at a time, in bulk, or shipped from a CSV of order number, courier and tracking number, is what sends the shopper’s WhatsApp, SMS and email updates.',
    ],
    render: () => shell('cms-orders', {
      crumbs: [['Sales'], ['Orders']], title: 'Orders',
      actions: btn('Export CSV', { icon: 'down' }),
      body: `
        ${tabs([['All', null, '4,812'], ['To pack', null, 9], ['Packed', null, 4], ['Shipped', null, 41], ['Out for delivery', null, 6], ['Delivered', null, '4,601'], ['Cancelled', null, 155], ['Returns', null, 2]], 'All')}
        <div class="row">${field('', '', { ph: 'Order no., phone or email', icon: 'search', cls: 'sp' })}${field('', 'Last 30 days', { sel: true, icon: 'cal' })}${field('', 'Payment: any', { sel: true })}${field('', 'State: any', { sel: true })}</div>
        <div class="row small" style="background:var(--fill);border-radius:6px;padding:6px 10px">${chk(true)}<b>2 selected</b>${btn('Mark packed', { sm: true })}${btn('Mark shipped', { sm: true })}${btn('Shipped from CSV', { sm: true, icon: 'upload' })}${pin(4)}${btn('Download invoices', { sm: true, icon: 'down' })}${pin(3)}${btn('Export', { sm: true })}</div>
        ${table(['Order', 'Placed', 'Customer', '>Items', '>Total', `Payment ${pin(1)}`, 'Delivery'], [
          ['<b class="mono">AQV-10482</b>', 'Today 09:41', 'Rahul Kulkarni<span class="sub">Pune, Maharashtra</span>', '2', '₹23,640.00', `${pill('Paid', 's-ok')}<span class="sub">UPI</span>`, pill('Not shipped', 's-off')],
          ['<b class="mono">AQV-10481</b>', 'Today 09:12', 'Sneha Reddy<span class="sub">Hyderabad, Telangana</span>', '1', '₹4,299.00', `${pill('COD, to collect', 's-warn')}${pin(2)}`, pill('Not shipped', 's-off')],
          ['<b class="mono">AQV-10479</b>', 'Yesterday 18:30', 'Vikram Singh<span class="sub">Jaipur, Rajasthan</span>', '3', '₹31,140.00', `${pill('Paid', 's-ok')}<span class="sub">Card</span>`, pill('Packed', 's-warn')],
          ['<b class="mono">AQV-10470</b>', '1 Oct 11:05', 'Anita Desai<span class="sub">Ahmedabad, Gujarat</span>', '1', '₹18,450.00', `${pill('Paid', 's-ok')}<span class="sub">Netbanking</span>`, `${pill('Out for delivery', 's-ok')}<span class="sub">Delhivery</span>`],
          ['<b class="mono">AQV-10466</b>', '30 Sep 16:22', 'Joseph Mathew<span class="sub">Kochi, Kerala</span>', '2', '₹8,940.00', `${pill('Paid', 's-ok')}<span class="sub">UPI</span>`, pill('Delivered', 's-ok')],
          ['<b class="mono">AQV-10462</b>', '30 Sep 10:02', 'Farhan Ali<span class="sub">Lucknow, Uttar Pradesh</span>', '1', '₹2,690.00', pill('Refunded', 's-off'), pill('Cancelled', 's-bad')],
        ], { go: 'cms-order', check: true })}`,
    }),
  });

  WF.screen({
    id: 'cms-order', surface: 'cms', group: 'Sales', title: 'Order detail',
    purpose: 'One order end to end: what was bought, the GST breakdown, payment, shipment, invoice and every event so far.',
    route: '/admin/collections/orders/:id', who: 'Owner, manager, order manager', data: ['orders', 'order-events', 'transactions', 'invoices', 'shipments', 'refunds', 'referrals'], docs: ['docs/11-orders-payments-gst.md'],
    notes: [
      'Order, payment and delivery statuses are shown separately. Staff cannot edit prices on a placed order; totals were fixed by the server at checkout.',
      'Delivery to Maharashtra (27) from a Gujarat (24) store is inter-state, so the whole tax is IGST. Within Gujarat it would be split into CGST and SGST.',
      'Invoice numbers run per financial year with no gaps, for example INV/26-27/00482.',
      'Each button is a checked status change. Marking as packed is allowed now; delivered is not, until it has shipped.',
      'Every change, email and payment event is written to the timeline with who and when.',
      'Messages lists every update sent for this order: channel, step, and whether it was delivered, read or failed, with the reason. Order roles can resend a message once every 10 minutes. Shopper replies on WhatsApp show here too.',
      'Offers and referral shows what the server applied at checkout: the scheme and coupon with the amount each took off (as separate lines in Items too), and, when the order was referred, the affiliate, how (link or coupon) and the commission with its status. Cancelling or refunding adjusts the commission automatically.',
    ],
    render: () => shell('cms-order', {
      nav: 'cms-orders', crumbs: [['Sales'], ['Orders', 'cms-orders'], ['AQV-10482']],
      title: `Order AQV-10482 ${pill('Confirmed', 's-ok')}${pill('Paid', 's-ok')}${pill('Not shipped', 's-off')}${pin(1)}`, sub: 'Placed today at 09:41 on the online store',
      actions: btn('Download invoice', { icon: 'down' }) + btn('Refund') + btn('Cancel order', { danger: true }) + btn('Mark as packed', { pri: true }) + pin(4),
      body: `<div class="g c21">
        <div class="col">
          ${card('Items', table(['Product', '>Price', '>Qty', '>GST', '>Total'], [
            [thumb('Aria single-lever basin mixer', 'Matt black · <span class="mono">AV-BM-1120-MB</span>'), '₹5,190.00', '1', '18%', '₹5,190.00'],
            [thumb('Nimbus wall-hung WC with soft-close seat', 'White · <span class="mono">AV-WH-2041-WH</span>'), '₹18,450.00', '1', '18%', '₹18,450.00'],
          ], { go: 'cms-product-edit' }) + `<div style="padding:10px 14px;border-top:1px solid var(--fill-2)"><div style="margin-left:auto;max-width:340px">${dl([
            ['Items total, incl. GST', '₹23,640.00'], ['Delivery', '₹0.00'], ['Taxable value', '₹20,033.90'], [`IGST 18% ${pin(2)}`, '₹3,606.10'], ['<b>Order total</b>', '<b>₹23,640.00</b>'],
          ])}<p class="xs muted" style="margin-top:6px">Place of supply Maharashtra (27). Store in Gujarat (24).</p></div></div>`, { flat: true })}
          ${card('Shipment', `<div class="empty-state">${icon('truck', 18)}<div>Not shipped yet</div></div>
            <div class="form3">${field('Carrier', 'Delhivery', { sel: true })}${field('Tracking number', '', { ph: 'AWB number' })}${field('Tracking link', '', { ph: 'Filled from the carrier' })}</div>
            <div class="row">${btn('Save and email customer', { pri: true })}<span class="sp"></span>${btn('Book with Shiprocket', { icon: 'truck' })}</div>`)}
          ${card(`Timeline ${pin(5)}`, `<div class="list small">
            <div><span class="mono faint nowrap">09:41</span><span>Order placed on the online store</span></div>
            <div><span class="mono faint nowrap">09:41</span><span>₹23,640.00 captured by Razorpay (UPI)</span></div>
            <div><span class="mono faint nowrap">09:41</span><span>WhatsApp confirmation sent to +91 98xxx xx210</span></div>
            <div><span class="mono faint nowrap">09:42</span><span>Invoice INV/26-27/00482 created</span></div>
            <div><span class="mono faint nowrap">09:42</span><span>Confirmation email sent to rahul.k@example.com</span></div>
          </div>${field('', '', { ph: 'Add a note for your team' })}`)}
          ${card(`Messages to the shopper ${pin(6)}`, `<div class="list small">
            ${[['whatsapp', 'WhatsApp', '09:41', pill('Read 09:43', 's-ok'), 1], ['mail', 'Email', '09:42', pill('Delivered', 's-ok'), 1], ['chat', 'SMS', 'not sent', pill('Not needed, WhatsApp delivered', 's-off'), 0]]
              .map(([ic, ch, t, st, r]) => `<div>${icon(ic, 15)}<div class="col sp" style="gap:0"><b>Order confirmed</b><span class="xs muted">${ch} · ${t}</span></div>${st}${r ? btn('Resend', { sm: true }) : ''}</div>`).join('')}
          </div><span class="xs muted">Opted in to WhatsApp at checkout. Next: “Packed” goes out 15 minutes after you mark it packed, unless it ships first.</span>`, { act: btn('Settings', { sm: true, ghost: true, go: 'cms-notifications' }) })}
        </div>
        <div class="col">
          ${card('Customer', `<b>Rahul Kulkarni</b><span class="small muted">rahul.k@example.com<br>+91 98xxx xx210 · 3rd order</span>${btn('View customer', { sm: true, go: 'cms-customers' })}`)}
          ${card('Delivery address', `<span class="small">Flat 12, Shanti Kunj, Baner Road<br>Pune, Maharashtra 411045</span><span class="xs muted">Billing: same as delivery · No GSTIN (personal order)</span>`)}
          ${card('Payment', dl([['Method', 'Razorpay · UPI'], ['Payment ID', '<span class="mono xs">pay_Q7x•••Lm2</span>'], ['Captured', 'Today 09:41'], ['Amount', '₹23,640.00']]))}
          ${card(`Invoice ${pin(3)}`, `<div class="row nw">${icon('file', 16)}<span class="mono small sp">INV/26-27/00482</span>${btn('', { icon: 'down', sm: true, label: 'Download invoice' })}</div><span class="xs muted">Credit notes: none</span>`)}
          ${card(`Offers and referral ${pin(7)}`, dl([['Scheme', '<span class="muted">none applied</span>'], ['Coupon', '<span class="muted">none</span>'], ['Referred by', '<span data-go="cms-affiliates"><b>Riya Sharma</b> · link /r/RIYA</span>'], ['Commission', `₹1,001.70 at 5% ${pill('Pending: not delivered yet', 's-warn')}`]]))}
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-customers', surface: 'cms', group: 'Sales', title: 'Customers',
    purpose: 'Shoppers with an account in this store, their orders and spend, and privacy requests.',
    route: '/admin/collections/customers', who: 'Owner, manager; order manager and support read-only', data: ['customers', 'orders', 'addresses', 'contact-preferences'], docs: ['docs/05-auth-and-roles.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Accounts belong to this store only. The same email in another vendor’s store is a separate account, and neither vendor sees the other.',
      'Under India’s DPDP Act a shopper can ask for their data or for deletion. Staff handle it here; orders keep what tax law requires.',
      'Guest checkouts appear in Orders only. Trade accounts (dealers, retailers, wholesalers, interior designers) arrive in Phase 2.',
      'Affiliate is a role on a normal shopper account, so an affiliate also shops here. “Offers” shows which channels the shopper agreed to receive offers on; staff can’t switch it on for them.',
    ],
    render: () => shell('cms-customers', {
      crumbs: [['Sales'], ['Customers']], title: 'Customers', sub: `2,318 accounts in this store ${pin(1)}`,
      actions: btn('Export CSV', { icon: 'down' }),
      body: `<div class="g c31">
        <div class="col">
          <div class="row">${field('', '', { ph: 'Name, email or phone', icon: 'search', cls: 'sp' })}${field('', 'Role: all', { sel: true })}${field('', 'Offers: any', { sel: true })}</div>
          ${table(['Customer', 'Phone', '>Orders', '>Spent', 'Last order', `Roles ${pin(4)}`, 'Offers', 'Joined'], [
            ['<b>Rahul Kulkarni</b><span class="sub">rahul.k@example.com</span>', '+91 98xxx xx210', '3', '₹32,470', 'Today', 'Shopper', 'Email', '14 Aug'],
            ['<b>Riya Sharma</b><span class="sub">riya@example.com</span>', '+91 98xxx xx455', '2', '₹9,880', '12 Sep', `Shopper, ${pill('Affiliate', 's-ok')}`, 'Email, WhatsApp', '12 Aug'],
            ['<b>Vikram Singh</b><span class="sub">vikram.s@example.com</span>', '+91 99xxx xx114', '1', '₹31,140', 'Yesterday', 'Shopper', no, '1 Oct'],
            ['<b>Anita Desai</b><span class="sub">anita.d@example.com</span>', '+91 97xxx xx508', '4', '₹41,620', '1 Oct', 'Shopper', 'WhatsApp', '22 Aug'],
            ['<b>Mehta Builders</b><span class="sub">purchase@mehta.example</span>', '+91 96xxx xx771', '2', '₹1,86,400', '18 Sep', `Trade: dealer ${tag.p2('P2')}`, no, '2 Sep'],
            ['<b>Joseph Mathew</b><span class="sub">joseph.m@example.com</span>', '+91 94xxx xx362', '1', '₹8,940', '30 Sep', 'Shopper', no, '30 Sep'],
          ], { go: null })}
          <p class="small muted">Guest orders are listed under Orders ${pin(3)}</p>
        </div>
        ${card(`Privacy requests ${pin(2)}`, `<div class="list small"><div><span class="sp">Data export · s.n@example.com</span>${pill('Due 9 Oct', 's-warn')}</div><div><span class="sp">Delete account · k.p@example.com</span>${pill('Done', 's-ok')}</div></div>${btn('Record a request', { sm: true })}`)}
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-enquiries', surface: 'cms', group: 'Sales', title: 'Enquiries inbox',
    purpose: 'Every question, quote request and dealership enquiry from the store in one inbox, with the product it was about.',
    route: '/admin/collections/enquiries', who: 'Owner, manager, order manager, support', data: ['enquiries', 'products'], docs: ['docs/08-modules-and-feature-flags.md', 'docs/06-data-model.md'],
    notes: [
      'All store forms land here: product questions, quote requests, dealership enquiries and the contact form. Needs the enquiries feature.',
      'Reply on WhatsApp opens a chat with the shopper’s number on the staff member’s phone or WhatsApp Web; no paid API is needed in the MVP.',
      'Turning a request into a formal quote with prices and validity comes with the Phase 2 dealer portal.',
    ],
    render: () => shell('cms-enquiries', {
      crumbs: [['Sales'], ['Enquiries']], title: 'Enquiries',
      body: zone(`<div class="g c12">
        <div class="col">
          ${tabs([['New', null, 5], ['In progress', null, 3], ['Closed', null, 212]], 'New')}
          ${field('', 'Type: all', { sel: true })}
          <div class="col" style="gap:8px">
            ${[['Quote request', 'Mehta Builders, Surat', '40 × Sola thermostatic diverter', '2 h', true], ['Product question', 'Kiran Joshi, Nashik', 'What is the rough-in size for the Nimbus WC?', '5 h'], ['Dealership', 'Sai Traders, Nagpur', 'We want to stock Aquaverde in Nagpur.', 'Yesterday'], ['Contact', 'Deepa Nair, Kochi', 'Need a copy of invoice INV/26-27/00311.', 'Yesterday']]
              .map(([t, w, s, when, on]) => `<div class="card" style="${on ? 'border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)' : ''}"><div class="cb" style="gap:2px;padding:10px 12px"><div class="row"><b class="small">${t}</b><span class="sp"></span><span class="xs faint">${when}</span></div><span class="small">${w}</span><span class="xs muted">${s}</span></div></div>`).join('')}
          </div>
        </div>
        ${card(`Quote request · Mehta Builders ${pin(1)}`, `
          <div class="g c2 small">${[['Name', 'Rakesh Mehta'], ['Company', 'Mehta Builders'], ['Phone', '+91 96xxx xx771'], ['Email', 'purchase@mehta.example'], ['City', 'Surat 395007'], ['Received', 'Today 07:52']].map(([k, v]) => `<div><div class="fl">${k}</div>${v}</div>`).join('')}</div>
          <div class="row nw callout" data-go="cms-product-edit">${ph('', { w: 44, h: 44 })}<div class="sp"><b class="small">Sola thermostatic diverter</b><div class="xs mono muted">AV-TD-4410 · Request a quote product</div></div><b>Qty 40</b></div>
          <p class="small">“Need 40 units for a residential project in Surat, delivery by November. Please share your best price with GST.”</p>
          <div class="row small">${icon('file', 14)}<span>BOQ-tower-B.pdf · 240 KB</span></div>
          <div class="form">${field('Assigned to', 'Arjun Mehta', { sel: true })}${field('Status', 'New', { sel: true })}</div>
          <div class="row">${btn('Reply by email', { icon: 'mail' })}${btn('Reply on WhatsApp', { icon: 'whatsapp' })}${pin(2)}<span class="sp"></span>${zone(btn('Create formal quote'), { p2: 'P2' })}${pin(3)}</div>
          ${field('Internal note', '', { ph: 'Only your team sees this', ta: true })}`)}
      </div>`, { flag: 'enquiries' }),
    }),
  });

  /* ---------------- Marketing (Phase 1 growth features; docs/11, docs/18) ---------------- */
  const bar = (label, left, width, st, on) => `<div class="row nw" style="gap:10px"><span class="xs" style="width:150px;flex:none">${label}</span><div class="sp" style="position:relative;height:18px;background:var(--fill);border-radius:4px"><i style="position:absolute;top:2px;bottom:2px;left:${left}%;width:${width}%;border-radius:3px;${on ? 'background:var(--ink)' : 'border:1.5px solid var(--ink);background:var(--paper)'}"></i></div><span class="xs muted" style="width:70px;flex:none">${st}</span></div>`;
  WF.screen({
    id: 'cms-schemes', surface: 'cms', group: 'Marketing', title: 'Schemes and offers',
    purpose: 'Every festival scheme and launch offer the store runs, past, live and planned, and what each one brought in.',
    route: '/admin/collections/schemes', who: 'Owner, manager; other roles read-only', data: ['schemes', 'daily-stats'], docs: ['docs/11-orders-payments-gst.md', 'docs/06-data-model.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Start from an occasion template (Diwali, Holi, New Year, Wedding Season, Special launch) or a blank scheme. The template fills the name, badge and offer type; the vendor always types the dates, because festival dates move every year.',
      'A scheme starts and ends by itself at the minute set. The timeline shows overlaps: when two schemes cover the same product the shopper gets the better price, and schemes never add up.',
      'Results come from the nightly rollup: orders, sales and discount given while the scheme was live.',
      'In Phase 1 schemes are for retail shoppers. Trade schemes for dealers, retailers, wholesalers and interior designers, and dealer anniversary offers, come in Phase 2 with trade accounts.',
    ],
    render: () => shell('cms-schemes', {
      crumbs: [['Marketing'], ['Schemes and offers']], title: 'Schemes and offers', sub: '1 live · 3 scheduled',
      actions: btn('New scheme', { pri: true, icon: 'plus', go: 'cms-scheme-edit' }),
      body: `
        ${card(`Start from an occasion ${pin(1)}`, `<div class="row">${['Diwali', 'Holi', 'New Year', 'Wedding Season', 'Special launch', 'Blank scheme'].map((t) => chip(t, { go: 'cms-scheme-edit' })).join('')}${zone(chip(`${icon('lock', 11)} Dealer anniversary`), { p2: 'P2' })}</div>`)}
        ${card(`Timeline, October 2026 to March 2027 ${pin(2)}`, `<div class="col" style="gap:6px">
          <div class="row nw xs muted" style="gap:10px"><span style="width:150px;flex:none"></span><div class="sp row nw" style="justify-content:space-between">${['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m) => `<span>${m}</span>`).join('')}</div><span style="width:70px;flex:none"></span></div>
          ${bar('Rainline launch', 0, 17, 'Live', true)}${bar('Diwali 2026', 17, 4.9, 'Scheduled')}${bar('Wedding Season', 27.5, 48.4, 'Scheduled')}${bar('New Year 2027', 48.4, 3.3, 'Scheduled')}${bar('Holi 2027', 90.7, 4.4, 'Draft')}
          <span class="xs muted">Wedding Season and New Year overlap from 28 Dec to 2 Jan: each product gets whichever gives the shopper the better price.</span></div>`)}
        ${tabs([['All', null, 8], ['Live', null, 1], ['Scheduled', null, 3], ['Draft', null, 1], ['Ended', null, 3]], 'All')}
        ${table(['Scheme', 'Offer', 'Covers', 'Dates', 'Status', `>Orders ${pin(3)}`, '>Discount given'], [
          ['<b>Rainline shower launch</b><span class="sub">Special launch</span>', 'Launch price ₹2,290 (was ₹2,690)', 'Rainline, 2 finishes', '15 Sep to 31 Oct', pill('Live', 's-ok'), '41', '₹16,400'],
          ['<b>Diwali 2026</b><span class="sub">Diwali</span>', '10% off, up to ₹1,500, orders above ₹3,000', 'Faucets, Showers', '1 Nov to 9 Nov', pill('Scheduled', 's-warn'), no, no],
          ['<b>Wedding Season 2026</b><span class="sub">Wedding Season</span>', 'Spend ₹25,000 get ₹2,000 off; ₹50,000 get ₹5,000 off', 'Whole store', '20 Nov to 15 Feb', pill('Scheduled', 's-warn'), no, no],
          ['<b>New Year 2027</b><span class="sub">New Year</span>', 'Free delivery', 'Whole store', '28 Dec to 2 Jan', pill('Scheduled', 's-warn'), no, no],
          ['<b>Holi 2027</b><span class="sub">Holi</span>', 'Buy 2 hand showers, get 1 free', 'Hand showers', '15 Mar to 22 Mar', pill('Draft', 's-off'), no, no],
          ['<b>Holi 2026</b><span class="sub">Holi</span>', '8% off accessories', 'Accessories', '1 Mar to 4 Mar 2026', pill('Ended', 's-off'), '96', '₹38,900'],
        ], { go: 'cms-scheme-edit' })}
        ${zone(`<div class="callout small">${icon('store', 14)}<span>Trade schemes (target and slab schemes for dealers, retailers, wholesalers and interior designers) and automatic dealer anniversary offers. ${pin(4)}</span></div>`, { p2: true, flag: 'trade-schemes' })}`,
    }),
  });

  WF.screen({
    id: 'cms-scheme-edit', surface: 'cms', group: 'Marketing', title: 'Scheme editor',
    purpose: 'Set up one scheme: when it runs, who gets it, the offer, what it covers, how the store shows it and who hears about it.',
    route: '/admin/collections/schemes/:id', who: 'Owner, manager', data: ['schemes', 'banners', 'pages', 'offer-campaigns', 'categories', 'merch-collections'], docs: ['docs/11-orders-payments-gst.md', 'docs/06-data-model.md', 'docs/14-security-and-compliance.md', 'docs/18-notifications.md'],
    notes: [
      'Start and end are to the minute in the store’s time zone. The scheme goes live and ends by itself, and store prices refresh at that minute. Checkout re-checks, so a scheme that just ended no longer applies.',
      'Phase 1 schemes are for all retail shoppers. Phase 2 adds trade audiences (dealers, retailers, wholesalers, interior designers).',
      'Offer types: percent off, flat off each item, spend tiers on the order, buy X get Y, free delivery and a special (launch) price per variant. One scheme per item; the better price for the shopper wins.',
      'Covers the whole store, categories, collections or chosen products. Enquire-only products are never discounted.',
      '“Works with coupons” off means a shopper picks either this scheme or a coupon; the cart explains which gives more. Prepaid-only and per-shopper limits are optional.',
      'Badge, announcement and countdown are text and settings, styled by each vendor’s storefront. The countdown can only point at this scheme’s real end, and the MRP shown is the product’s real MRP (dark patterns rules, docs/14).',
      '“Tell shoppers” schedules an offer message to shoppers who opted in, on the channels they chose. WhatsApp offers are marketing messages billed to the vendor’s Meta account.',
      'The preview runs the same server engine as checkout, on sample products and a sample cart. GST is worked out on the discounted price.',
      'Every change to a scheme is written to the audit log. Changing the offer of a live scheme asks for confirmation; past dates can’t be edited.',
    ],
    render: () => shell('cms-scheme-edit', {
      nav: 'cms-schemes', crumbs: [['Marketing'], ['Schemes and offers', 'cms-schemes'], ['Diwali 2026']],
      title: `Diwali 2026 ${pill('Scheduled', 's-warn')}`, sub: 'Starts in 29 days · created from the Diwali template by Priya Shah today',
      actions: btn('Preview on store', { icon: 'ext', go: 'st-offers' }) + btn('Save draft') + btn('Schedule', { pri: true }),
      body: `<div class="g c31">
        <div class="col">
          ${card(`When ${pin(1)}`, `<div class="form">${field('Name', 'Diwali 2026', { req: true })}${field('Occasion', 'Diwali', { sel: true })}
            ${field('Starts', 'Sun, 1 Nov 2026, 00:00', { icon: 'cal', req: true })}${field('Ends', 'Mon, 9 Nov 2026, 23:59', { icon: 'cal', req: true })}
            ${field('Landing page address', '<span class="mono">/offers/diwali-2026</span>', { cls: 's2', help: 'Times are India time (Asia/Kolkata)' })}</div>`)}
          ${card(`Who gets it ${pin(2)}`, `<div class="col" style="gap:6px">${radio(true, '<b>All shoppers</b>')}
            ${zone(`<div class="row" style="padding:4px 0">${['Dealers', 'Retailers', 'Wholesalers', 'Interior designers'].map((t) => chk(false, t)).join('')}</div>`, { p2: 'Trade audiences, P2' })}</div>`)}
          ${card(`Offer ${pin(3)}`, `<div class="row" style="gap:6px">${[['Percent off', 1], ['Flat off each item'], ['Spend tiers'], ['Buy X get Y'], ['Free delivery'], ['Special price']].map(([t, on]) => chip(t, { on: !!on })).join('')}</div>
            <div class="form3">${field('Discount', '10', { suffix: '%' })}${field('Most off per order', '₹1,500')}${field('Minimum order', '₹3,000', { help: 'After other discounts' })}</div>`)}
          ${card(`Covers ${pin(4)}`, `<div class="row small">${radio(false, 'Whole store')}${radio(true, 'Categories')}${radio(false, 'Collections')}${radio(false, 'Chosen products')}</div>
            <div class="row">${chip('Faucets · 104 products', { x: true })}${chip('Showers · 65 products', { x: true })}${chip('+ Add')}</div>
            <div class="row small"><span class="muted">Leave out:</span><span>Aria sensor basin mixer</span>${chip('+ Add')}</div><span class="help">Enquire-only products are always left out. 168 products covered.</span>`)}
          ${card(`Rules ${pin(5)}`, `<div class="col" style="gap:8px">${tog(false, 'Works with coupons')}${tog(false, 'Only for orders paid online')}${field('Orders per shopper', 'No limit', { sel: true })}</div>`)}
          ${card(`On the store ${pin(6)}`, `<div class="form">${field('Badge', 'Diwali offer')}${field('Announcement bar', 'Diwali offer: 10% off faucets and showers till 9 Nov')}
            <div class="fld"><span class="fl">Banner</span>${ph('Desktop 1920 × 600 · phone 780 × 600', { h: 70 })}</div>${field('Landing page', 'Diwali offers · scheduled', { sel: true, help: 'Or let the store list the products' })}
            <div class="s2 col" style="gap:6px">${tog(true, 'Show on the Offers page before it starts')}${tog(true, 'Show a countdown to the end (9 Nov, 23:59)')}</div></div>`)}
          ${zone(card(`Tell shoppers ${pin(7)}`, `<div class="list small">
            <div>${icon('mail', 15)}<span class="sp">Email shoppers who opted in, when it starts</span><span class="xs muted">2,140 shoppers</span>${tog(true)}</div>
            ${zone(`<div style="display:flex;align-items:center;gap:10px">${icon('whatsapp', 15)}<span class="sp">WhatsApp shoppers who opted in</span><span class="xs muted">860 · about ₹876 on your Meta bill</span>${tog(true)}</div>`, { flag: 'whatsapp-offers' })}</div>
            ${btn('Edit the message', { sm: true, go: 'cms-campaigns' })}`), { flag: 'offer-messages' })}
        </div>
        <div class="col">
          ${card('Status', `<div class="row">${pill('Scheduled', 's-warn')}<span class="small muted">goes live Sun, 1 Nov, 00:00</span></div><div class="row">${btn('Pause', { sm: true })}${btn('End now', { sm: true, danger: true })}</div>`)}
          ${card(`Preview ${pin(8)}`, `<div class="pc" style="max-width:190px">${ph('Product photo', { ar: '1/1', inner: '<span class="badge">Diwali offer</span>' })}<span class="mn">AV-BM-1120</span><span class="t">Aria single-lever basin mixer</span><div class="pr"><b>₹3,825</b><s>₹5,600</s><em>32% off</em></div><span class="xs">Diwali offer · until 9 Nov</span></div>
            <div class="hr"></div><span class="sec-t">Sample cart</span>
            ${dl([['Aria basin mixer · Chrome', '₹4,250.00'], ['Rainline overhead shower · Chrome', '₹2,690.00'], ['Diwali offer, 10%', '−₹694.00'], ['<b>Total</b>', '<b>₹6,246.00</b>']])}
            <span class="xs muted">GST is worked out on ₹6,246.00. Worked out by the same engine as checkout.</span>`)}
          ${card('Results', `<div class="empty-state">Orders, sales and discount given appear once it starts.</div>`)}
          ${card(`History ${pin(9)}`, `<div class="list small"><div><span class="mono faint nowrap">Today 09:48</span><span>Priya created it from the Diwali template</span></div><div><span class="mono faint nowrap">Today 09:55</span><span>Priya set 10% off, up to ₹1,500</span></div></div>`)}
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-coupons', surface: 'cms', group: 'Marketing', title: 'Coupons',
    purpose: 'Codes shoppers type at the cart: what each gives, its limits and how often it has been used.',
    route: '/admin/collections/coupons', who: 'Owner, manager; other roles read-only', data: ['coupons', 'coupon-redemptions', 'affiliates', 'schemes'], docs: ['docs/11-orders-payments-gst.md', 'docs/06-data-model.md'],
    notes: [
      'One coupon per order. Codes are unique in this store and match whatever the case the shopper types.',
      'Per-shopper limits are checked by phone and email at checkout, so a guest can’t reuse a once-only code by not signing in. Uses count when an order is placed and come back if it is cancelled before payment.',
      'Public codes are listed at the cart and on the Offers page; private codes are only typed. A scheme set to not work with coupons blocks them while it is live.',
      'Bulk codes: hundreds of single-use codes from one coupon, for a printed leaflet or a partner. The list arrives as a CSV by email.',
      'A coupon linked to an affiliate also credits that affiliate with the order. Every change is written to the audit log.',
    ],
    render: () => shell('cms-coupons', {
      crumbs: [['Marketing'], ['Coupons']], title: 'Coupons', sub: '5 active · 1 expired',
      actions: btn('Make bulk codes', { icon: 'layers' }) + btn('New coupon', { pri: true, icon: 'plus' }),
      body: `<div class="g c21">
        <div class="col">
          ${tabs([['All', null, 6], ['Active', null, 5], ['Expired', null, 1]], 'All')}
          ${table(['Code', 'Gives', 'Conditions', `>Used ${pin(2)}`, 'Valid', `Shown ${pin(3)}`, 'Status'], [
            ['<b class="mono">AQUA500</b>', '₹500 off', 'Orders above ₹20,000 · once per shopper', '12 / 500', '1 Oct to 31 Dec', 'Public', pill('Active', 's-ok')],
            ['<b class="mono">PREPAID5</b>', '5% off, up to ₹750', 'Pay online only', '64', 'No end', 'Public', pill('Active', 's-ok')],
            ['<b class="mono">WELCOME10</b>', '10% off, up to ₹1,000', 'First order only', '208', 'No end', 'Private', pill('Active', 's-ok')],
            [`<b class="mono">RIYA10</b><span class="sub">Affiliate: Riya Sharma ${pin(5)}</span>`, '10% off, up to ₹1,000', 'Credits the affiliate', '7', 'No end', 'Private', pill('Active', 's-ok')],
            [`<b class="mono">WED-••••</b><span class="sub">500 single-use codes ${pin(4)}</span>`, '₹1,000 off', 'Orders above ₹15,000', '37 / 500', '20 Nov to 15 Feb', 'Private', pill('Active', 's-ok')],
            ['<b class="mono">FREESHIP</b>', 'Free delivery', 'Orders above ₹499', '1,000 / 1,000', 'Ended 30 Sep', 'Public', pill('Expired', 's-off')],
          ], { go: null })}
          ${card('Make bulk codes', `<div class="form3">${field('Prefix', 'WED')}${field('How many', '500')}${field('Based on', 'Wedding leaflet coupon', { sel: true })}</div><div class="row">${btn('Make codes', { sm: true })}<span class="xs muted">Runs in the background; the CSV comes by email.</span></div>`)}
        </div>
        ${card(`AQUA500 ${pin(1)}`, `<div class="form">
          ${field('Code', '<span class="mono">AQUA500</span>', { req: true })}${field('Note for staff', 'October to December, big orders')}
          <div class="fld s2"><span class="fl">Gives</span><div class="row">${radio(false, 'Percent off')}${radio(true, 'Amount off')}${radio(false, 'Free delivery')}</div></div>
          ${field('Amount', '₹500')}${field('Minimum order', '₹20,000')}
          ${field('Covers', 'Whole store', { sel: true })}${field('Payment', 'Any method', { sel: true })}
          ${field('Starts', '1 Oct 2026', { icon: 'cal' })}${field('Ends', '31 Dec 2026, 23:59', { icon: 'cal' })}
          ${field('Total uses', '500')}${field('Per shopper', '1', { help: 'Checked by phone and email' })}
          <div class="s2 col" style="gap:6px">${tog(false, 'First order only')}${tog(true, 'Show at the cart and on the Offers page')}</div>
          ${field('Linked affiliate', 'None', { sel: true })}${field('Linked scheme', 'None', { sel: true })}
        </div><div class="row">${btn('Save', { pri: true })}${btn('Pause', { sm: true })}</div>`)}
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-campaigns', surface: 'cms', group: 'Marketing', title: 'Offer messages',
    purpose: 'Offer emails and WhatsApp messages to shoppers who asked for them: who gets each one, when, and what it brought in.',
    route: '/admin/collections/offer-campaigns', who: 'Owner, manager, content editor', data: ['offer-campaigns', 'contact-preferences', 'notification-templates', 'notification-logs'], docs: ['docs/18-notifications.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Only shoppers who ticked the offers box for that channel are counted and sent to. Staff can’t add or import people without that consent.',
      'Before scheduling, the screen shows how many will get it after unsubscribes, bounces and the weekly cap. Sending runs in batches inside the send window.',
      'WhatsApp offers use the vendor’s own approved marketing templates, with a “Stop offers” button, and are billed by Meta to the vendor (about ₹1.02 each including GST). The platform team switches WhatsApp offers on or off for each vendor from super admin; without it the WhatsApp channel doesn’t appear here. Email offers go from the vendor’s domain with a one-click unsubscribe.',
      'Results: delivered, read or opened, clicked, unsubscribed, and orders and sales within 7 days of the message.',
      'The send window and weekly cap are vendor settings within platform limits. Complaints and bounces stop emails to that address automatically.',
    ],
    render: () => shell('cms-campaigns', {
      crumbs: [['Marketing'], ['Offer messages']], title: 'Offer messages', sub: 'Sent only to shoppers who asked for offers',
      actions: btn('New message', { pri: true, icon: 'plus' }),
      body: `<div class="g c21">
        <div class="col">
          ${table(['Message', 'Channels', 'Send', 'Status', '>Sent', `>Orders ${pin(4)}`, '>Sales'], [
            ['<b>Rainline launch is here</b><span class="sub">Scheme: Rainline launch · all opted in</span>', 'Email, WhatsApp', '15 Sep, 11:00', pill('Sent', 's-ok'), '2,912', '31', '₹71,000'],
            ['<b>Diwali offer starts today</b><span class="sub">Scheme: Diwali 2026 · all opted in</span>', 'Email, WhatsApp', '1 Nov, 10:30', pill('Scheduled', 's-warn'), no, no, no],
            ['<b>Last 2 days of Diwali</b><span class="sub">Wishlisted products in the Diwali offer</span>', 'Email', '8 Nov, 11:00', pill('Draft', 's-off'), no, no, no],
          ], { go: null })}
          ${card(`Diwali offer starts today ${pin(1)}`, `<div class="form">
            ${field('Scheme', 'Diwali 2026', { sel: true })}${field('Send at', 'Sun, 1 Nov, 10:30', { icon: 'cal', help: 'Inside your window, 10:00 to 20:00' })}
            <div class="fld s2"><span class="fl">Who</span><div class="col" style="gap:4px">${radio(true, 'Everyone who opted in')}${radio(false, 'Bought from chosen categories')}${radio(false, 'Wishlisted products in this scheme')}${radio(false, 'No order in the last 90 days')}</div></div>
            <div class="fld s2"><span class="fl">Channels</span><div class="list small">
              <div>${icon('mail', 15)}<span class="sp">Email · subject “Diwali offer: 10% off faucets and showers”</span>${tog(true)}</div>
              <div>${icon('whatsapp', 15)}<span class="sp">WhatsApp · template <span class="mono">diwali_offer_v1</span> ${pill('Approved, marketing', 's-ok')}</span>${tog(true)}</div></div></div>
            <div class="callout s2 small">${icon('users', 14)}<span><b>2,140 by email and 860 on WhatsApp</b> after unsubscribes, bounces and the 2-a-week cap. WhatsApp: about ₹876 on your Meta bill. ${pin(2)}</span></div>
          </div><div class="row">${btn('Send test to me', { icon: 'phone' })}${btn('Schedule', { pri: true })}</div>`)}
        </div>
        <div class="col">
          ${card(`Preview ${pin(3)}`, `<div class="wa"><div class="wa-h">${ph('', { w: 28, h: 28, cls: 'round' })}<div class="sp"><b class="small">Aquaverde</b><div class="xs muted">Business account</div></div></div>
            ${ph('Diwali banner', { h: 90 })}<div class="wa-b">Hi Rahul, our Diwali offer is on: 10% off all faucets and showers, up to ₹1,500, on orders above ₹3,000. Ends Mon, 9 Nov.<span class="wa-t">10:30</span></div>
            <div class="wa-btn">${icon('ext', 13)} Shop the offer</div><div class="wa-btn">Stop offers</div></div>`)}
          ${card(`Settings ${pin(5)}`, `${field('Send window', '10:00 to 20:00')}${field('Offer messages per shopper', '2', { suffix: 'a week', help: 'Platform limit: 3' })}
            <div class="row">${icon('whatsapp', 15)}<span class="sp small">WhatsApp offers</span>${pill('On, set by your platform team', 's-ok')}</div><span class="xs muted">3 marketing templates approved. Ask your platform contact to switch it on or off.</span>
            <div class="list small"><div><span class="sp">Opted in by email</span><b>2,236</b></div><div><span class="sp">Opted in on WhatsApp</span><b>904</b></div><div><span class="sp">Unsubscribed this month</span><b>96</b></div><div><span class="sp">Spam complaints, 30 days</span><b>0.02%</b></div></div>`)}
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-abandoned', surface: 'cms', group: 'Marketing', title: 'Abandoned carts',
    purpose: 'Carts left without an order, the reminders sent to shoppers who agreed to offers, and the sales they brought back.',
    route: '/admin/collections/carts?status=abandoned', who: 'Owner, manager', data: ['carts', 'notification-logs', 'coupons', 'contact-preferences'], docs: ['docs/18-notifications.md', 'docs/06-data-model.md'],
    notes: [
      'A cart counts as abandoned when it has items and a contact (signed in, or the checkout contact step) and nothing happened for the first-reminder delay. Reminders go only to shoppers who ticked the offers box for that channel.',
      'At most two reminders per cart and one series per shopper a week. The second can carry a single-use code. Ordering, emptying the cart or unsubscribing stops them.',
      'The button in the reminder restores the exact cart on any device for 7 days. Prices are recalculated, so an offer that ended isn’t honoured.',
      'Recovered means an order within 7 days of a reminder. Contacts are masked here.',
      'Reminders follow the offer send window, so a cart left at night is reminded after 10:00.',
    ],
    render: () => shell('cms-abandoned', {
      crumbs: [['Marketing'], ['Abandoned carts']], title: 'Abandoned carts', sub: 'Last 7 days',
      body: `
        <div class="g c4">${kpi('Abandoned', '96', 'with items and a contact')}${kpi('Reminded', '71', 'agreed to offers', { pin: 1 })}${kpi('Recovered', '14', '19.7% of reminded', { pin: 4 })}${kpi('Recovered sales', '₹31,280', 'incl. GST')}</div>
        <div class="g c21">
          ${card('Carts', table(['Shopper', 'Items', '>Value', 'Left at', 'Reminders', 'Result'], [
            ['r•••@example.com', 'Aria basin mixer, Nimbus WC', '₹23,640', 'Today 08:12', '1st sent 09:12 · email, WhatsApp', pill('Waiting', 's-warn')],
            ['+91 97xxx xx508', 'Rainline shower × 2', '₹4,580', 'Yesterday 21:40', `1st sent today 10:00 ${pin(5)}`, `${pill('Recovered', 's-ok')}<span class="sub mono">AQV-10480</span>`],
            ['s•••@example.com', 'Edge countertop basin', '₹7,990', '1 Oct 16:05', '1st and 2nd sent', pill('No order', 's-off')],
            ['Guest, no consent', 'Quadra towel rail', '₹1,890', 'Today 07:30', 'Not reminded: no offer consent', no],
          ], { go: null }), { flat: true })}
          ${card(`Reminders ${pin(2)}`, `
            <div class="list small"><div><b class="sp">First reminder</b><span>after 60 minutes</span></div><div><span class="sp muted">Email · WhatsApp (if switched on by the platform)</span>${tog(true)}${tog(true)}</div>
            <div><b class="sp">Second reminder</b><span>after 24 hours</span></div><div><span class="sp muted">Email · WhatsApp (if switched on by the platform)</span>${tog(true)}${tog(false)}</div></div>
            ${field('Code in the second reminder', 'COMEBACK5 · 5% off up to ₹500, single use', { sel: true })}
            <span class="help">Only shoppers who agreed to offers on that channel. Restore links last 7 days. ${pin(3)}</span>`)}
        </div>`,
    }),
  });

  WF.screen({
    id: 'cms-affiliates', surface: 'cms', group: 'Marketing', title: 'Affiliates',
    purpose: 'People who promote the store for a commission: applications, rates, what they referred, what is owed and what has been paid.',
    route: '/admin/collections/affiliates', who: 'Owner, manager; order manager read-only; payouts owner only', data: ['affiliates', 'referrals', 'affiliate-payouts', 'affiliate-clicks', 'coupons'], docs: ['docs/11-orders-payments-gst.md', 'docs/05-auth-and-roles.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Shoppers apply from the store’s affiliate page with their account. Approving gives them a code and link (/r/CODE); a personal coupon is optional.',
      'Commission is a share of the order value before GST, delivery and COD fee, after discounts, at the affiliate’s rate or a category rate. It stays pending until the return window closes, then is approved by itself; cancellations, returns and refunds reduce or reverse it.',
      'The vendor pays affiliates itself (UPI or bank) and records the payment here; the platform never holds the money. Statements show gross, TDS and net. TDS of 2% applies once an affiliate’s commission passes ₹20,000 in a financial year (20% without PAN); have your CA confirm.',
      'Bank details and PAN are encrypted and masked. Only the owner sees them in full, and only while recording a payout. Every payout is written to the audit log.',
      'An affiliate’s own orders never earn commission. Unusual patterns (many orders to one address) show in the affiliate report.',
    ],
    render: () => shell('cms-affiliates', {
      crumbs: [['Marketing'], ['Affiliates']], title: 'Affiliates', sub: '38 approved · ₹6,420 pending · ₹3,150 approved to pay',
      actions: btn('Program settings', { icon: 'gear' }),
      body: `<div class="g c21">
        <div class="col">
          ${tabs([['Approved', null, 38], ['Applications', null, 2], ['Paused', null, 1]], 'Approved')}
          ${table(['Affiliate', 'Code', 'Rate', '>Clicks, 30 d', '>Orders, 30 d', `>Pending ${pin(2)}`, '>Approved', '>Paid to date'], [
            { c: ['<b>Riya Sharma</b><span class="sub">Instagram · home styling</span>', '<span class="mono">RIYA</span> · <span class="mono">RIYA10</span>', '5%, showers 8%', '1,240', '18', '₹2,140', '₹1,180', '₹7,250'], go: null },
            { c: ['<b>Homes by Kavitha</b><span class="sub">YouTube</span>', '<span class="mono">KAVITHA</span>', '6%', '2,860', '9', '₹1,760', '₹640', '₹11,900'], go: null },
            { c: ['<b>Arvind Electricals</b><span class="sub">WhatsApp groups · fitter</span>', '<span class="mono">ARVIND</span>', '5%', '310', '6', '₹980', '₹420', '₹2,600'], go: null },
          ])}
          ${card(`Applications ${pin(1)}`, `<div class="list small"><div><div class="col sp" style="gap:0"><b>Neel Desai</b><span class="muted">Website · bathroom renovation blog · applied 2 Oct</span></div>${btn('Approve', { sm: true, pri: true })}${btn('Reject', { sm: true })}</div>
            <div><div class="col sp" style="gap:0"><b>Sana Interiors</b><span class="muted">Instagram · interior designer · applied 1 Oct</span></div>${btn('Approve', { sm: true, pri: true })}${btn('Reject', { sm: true })}</div></div>
            <span class="xs muted">Interior designers can join as trade partners in Phase 2, with trade prices and commission on client orders.</span>`)}
        </div>
        <div class="col">
          ${card('Riya Sharma', `${dl([['Status', pill('Approved', 's-ok')], ['Since', '12 Aug 2026'], ['Rate', '5%, Showers 8%'], ['Coupon', '<span class="mono">RIYA10</span> · 10% off up to ₹1,000'], [`Payout to ${pin(4)}`, 'UPI ri••••@okaxis'], ['PAN', '<span class="mono">ABCPS••••K</span>'], ['This financial year', '₹10,570 (TDS from ₹20,000)']])}<div class="row">${btn('Change rate', { sm: true })}${btn('Pause', { sm: true })}</div>`)}
          ${card(`Record payout ${pin(3)}`, `<div class="list small"><div><span class="sp">Statement</span><span class="mono">PAY/26-27/0015 · draft</span></div><div><span class="sp">Approved so far in October</span><span>₹1,180.00</span></div><div><span class="sp">TDS</span><span>₹0.00</span></div><div><b class="sp">To pay</b><b>₹1,180.00</b></div></div>
            ${field('Paid on', '', { ph: 'Date', icon: 'cal' })}${field('Method', 'UPI', { sel: true })}${field('UTR or reference', '', { ph: 'For example 4021••••7731' })}
            ${btn('Mark paid and email statement', { pri: true, block: true })}<span class="xs muted">Owner only</span>`)}
          ${card(`Program ${pin(5)}`, `${dl([['Default rate', '5%'], ['Referral cookie', '30 days, last click'], ['Approved after', 'return window (7 days)'], ['Minimum payout', '₹500'], ['Terms page', '/pages/affiliate-terms']])}`)}
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-reviews', surface: 'cms', group: 'Marketing', title: 'Reviews',
    purpose: 'Approve, reject or answer shoppers’ product reviews, and set when buyers are asked for one.',
    route: '/admin/collections/reviews', who: 'Owner, manager, content editor, support', data: ['reviews', 'products', 'orders'], docs: ['docs/06-data-model.md', 'docs/14-security-and-compliance.md', 'docs/18-notifications.md'],
    notes: [
      'Every review is from a buyer of a delivered item (verified purchase), one per item.',
      'Approve honest reviews whatever the rating. Reject only for abuse, personal details, spam, duplicates or text not about the product, and pick the reason; a low rating is never a reason.',
      'Staff can reply publicly but never edit a shopper’s words. The reply shows under the review and the shopper gets an email.',
      'The review request goes once per order, a set number of days after delivery, by email (and WhatsApp when switched on). It never offers anything in return for a review.',
      'Ratings on the store update as soon as a review is approved.',
    ],
    render: () => shell('cms-reviews', {
      crumbs: [['Marketing'], ['Reviews']], title: 'Reviews', sub: '4.6 average from 412 published reviews',
      body: `<div class="g c21">
        <div class="col">
          ${tabs([['To approve', null, 6], ['Published', null, 412], ['Rejected', null, 9]], 'To approve')}
          <div class="row">${field('', 'Rating: all', { sel: true })}${field('', 'Product: all', { sel: true })}${chk(false, 'With photos')}</div>
          ${card('', `<div class="row">${WF.stars('5.0')}<b class="small sp">Looks premium, no water spots</b>${pill('Verified purchase', 's-ok')}</div><span class="xs muted">Meera S., Ahmedabad · Aria basin mixer, matt black · AQV-09650 · today 08:20</span><p class="small">Fitted it on a counter-top basin. The matt black hides hard-water marks better than our old chrome tap.</p><div class="row">${ph('', { w: 56, h: 56 })}${ph('', { w: 56, h: 56 })}</div><div class="row">${btn('Approve', { sm: true, pri: true })}${btn('Reject', { sm: true })}${btn('Reply', { sm: true })}</div>`)}
          ${card('', `<div class="row">${WF.stars('2.0')}<b class="small sp">Seat hinge broke in a month</b>${pill('Verified purchase', 's-ok')}</div><span class="xs muted">Farooq A., Lucknow · Nimbus wall-hung WC · AQV-09917 · yesterday</span><p class="small">The WC is fine but the soft-close hinge snapped after four weeks.</p>
            <div class="callout xs">${icon('shield', 13)}<span>Low ratings are published like any other. Reply to help the shopper. ${pin(2)}</span></div>
            ${field('Public reply', 'Sorry about this, Farooq. The seat has a 1-year warranty; we have sent a replacement hinge free. Our team will call you today.', { ta: true })}<div class="row">${btn('Approve with reply', { sm: true, pri: true })}${btn('Reject', { sm: true })}</div>`)}
          ${card('', `<div class="row">${WF.stars('1.0')}<b class="small sp">Call me</b>${pill('Verified purchase', 's-ok')}</div><span class="xs muted">Unnamed · Rainline shower · AQV-10102 · yesterday</span><p class="small">Not working, call me on 98•••••321 urgently.</p>
            <div class="row">${field('', 'Reason: personal details', { sel: true, cls: 'sp' })}${btn('Reject', { sm: true, danger: true })}${btn('Open an enquiry', { sm: true, go: 'cms-enquiries' })}</div>`)}
        </div>
        <div class="col">
          ${card(`Settings ${pin(4)}`, `${tog(true, 'Hold new reviews for approval')}${tog(true, 'Show reviews on product pages')}${tog(true, 'Allow photos (up to 4)')}
            ${field('Ask for a review', '5', { suffix: 'days after delivery' })}
            <div class="list small"><div>${icon('mail', 15)}<span class="sp">Email</span>${tog(true)}</div><div>${icon('whatsapp', 15)}<span class="sp">WhatsApp (needs WhatsApp offers from the platform, and offers consent)</span>${tog(false)}</div></div>`)}
          ${card('This month', `<div class="list small"><div><span class="sp">Requests sent</span><b>486</b></div><div><span class="sp">Reviews received</span><b>73 (15%)</b></div><div><span class="sp">Approved / rejected</span><b>66 / 1</b></div><div><span class="sp">Average rating ${pin(5)}</span><b>4.5</b></div></div><span class="xs muted">Rejected reviews keep their reason ${pin(1)} · staff never edit a review ${pin(3)}</span>`)}
        </div>
      </div>`,
    }),
  });

  /* ---------------- Content ---------------- */
  WF.screen({
    id: 'cms-pages', surface: 'cms', group: 'Content', title: 'Pages',
    purpose: 'The store’s content pages, from the home page to policies, with drafts and scheduled publishing.',
    route: '/admin/collections/pages', who: 'Owner, manager, content editor', data: ['pages'], docs: ['docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Pages can be scheduled. A festive landing page can go live at 10:00 on the day without anyone online.',
      'Policy pages are linked from the footer and from checkout. A store should not launch with a policy still in draft.',
      'Every save keeps a version that can be previewed and restored.',
    ],
    render: () => shell('cms-pages', {
      crumbs: [['Content'], ['Pages']], title: 'Pages', sub: '12 pages',
      actions: btn('New page', { pri: true, icon: 'plus' }),
      body: table(['Title', 'Address', 'Template', 'Status', 'Updated'], [
        { c: ['<b>Home</b>', '<span class="mono xs">/</span>', 'Landing', pill('Published', 's-ok'), 'Today 08:30 · Kavya'], go: 'cms-page-edit' },
        { c: ['<b>Diwali offers</b><span class="sub">Landing page of the Diwali 2026 scheme</span>', '<span class="mono xs">/offers/diwali-2026</span>', 'Landing', pill('Scheduled 1 Nov, 00:00', 's-warn'), 'Today 09:50 · Kavya'], go: 'cms-scheme-edit' },
        { c: ['<b>About us</b>', '<span class="mono xs">/pages/about</span>', 'Default', pill('Published', 's-ok'), '20 Aug · Kavya'], go: 'cms-page-edit' },
        { c: ['<b>Bathroom collections</b>', '<span class="mono xs">/pages/collections</span>', 'Landing', `${pill('Scheduled 5 Oct, 10:00', 's-warn')}${pin(1)}`, 'Yesterday · Kavya'], go: 'cms-page-edit' },
        { c: ['<b>Warranty policy</b>', '<span class="mono xs">/pages/warranty</span>', 'Policy', `${pill('Draft', 's-off')}${pin(2)}`, '28 Sep · Priya'], go: 'cms-page-edit' },
        { c: ['<b>Shipping policy</b>', '<span class="mono xs">/pages/shipping</span>', 'Policy', pill('Published', 's-ok'), '18 Aug · Priya'], go: 'cms-page-edit' },
        { c: ['<b>Returns and refunds</b>', '<span class="mono xs">/pages/returns</span>', 'Policy', pill('Published', 's-ok'), '18 Aug · Priya'], go: 'cms-page-edit' },
        { c: ['<b>Privacy policy</b>', '<span class="mono xs">/pages/privacy</span>', 'Policy', pill('Published', 's-ok'), '18 Aug · Priya'], go: 'cms-page-edit' },
        { c: ['<b>Terms of use</b>', '<span class="mono xs">/pages/terms</span>', 'Policy', pill('Published', 's-ok'), '18 Aug · Priya'], go: 'cms-page-edit' },
      ]) + `<p class="small muted">Versions are kept for every save ${pin(3)}</p>`,
    }),
  });

  WF.screen({
    id: 'cms-page-edit', surface: 'cms', group: 'Content', title: 'Page builder',
    purpose: 'Build a page from ready-made blocks, fill in their content and preview it on phone and desktop before publishing.',
    route: '/admin/collections/pages/:id', who: 'Owner, manager, content editor', data: ['pages', 'media', 'products', 'categories'], docs: ['docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'Staff choose and order blocks. How each block looks comes from the vendor’s storefront code, so every page stays on-brand without a design tool.',
      'Block data has the same shape for every vendor, which is what lets one CMS serve many different storefront designs.',
      'Separate phone images keep the first screen fast on mobile.',
      'Preview shows the draft in the real storefront code, not an approximation.',
      'Blocks of optional features (offer strip, scheme products, coupon list, reviews, offers sign-up, affiliate invite) show only when their feature is on, and the offer strip hides itself on the store when no scheme is live. Phase 2 blocks show only when their module is on.',
    ],
    render: () => shell('cms-page-edit', {
      nav: 'cms-pages', crumbs: [['Content'], ['Pages', 'cms-pages'], ['Home']],
      title: `Home ${pill('Published', 's-ok')} ${pill('Unpublished changes', 's-warn')}`, sub: `Same blocks, each vendor’s own look ${pin(2)}`,
      actions: btn('Versions') + btn('Preview', { icon: 'ext', go: 'st-home' }) + btn('Save draft') + btn('Schedule', { icon: 'cal' }) + btn('Publish', { pri: true }),
      body: `<div class="g" style="grid-template-columns:220px minmax(0,1fr) 250px">
        <div class="col">
          ${card(`Blocks on this page ${pin(1)}`, `<div class="col small" style="gap:4px">${['Hero slider', 'Benefits strip', 'Category tiles', 'Product carousel: Bestsellers', 'Banner: Matt black range', 'Brand story and numbers', 'Dealer finder', 'Testimonials', 'FAQ']
            .map((b, i) => `<div class="row nw" style="padding:6px 8px;border-radius:5px;${i === 0 ? 'background:var(--fill);box-shadow:inset 0 0 0 1px var(--ink);font-weight:600' : 'border:1px solid var(--fill-2)'}">${icon('drag', 13)}<span class="sp">${b}</span></div>`).join('')}</div>${btn('Add block', { sm: true, icon: 'plus', block: true })}`)}
          ${card(`Block types ${pin(5)}`, `<div class="row" style="gap:5px">${['Hero', 'Banner', 'Product grid', 'Carousel', 'Category tiles', 'Rich text', 'Image and text', 'Benefits', 'Testimonials', 'FAQ', 'Video', 'Downloads', 'Dealer finder', 'Enquiry form', 'Brand story', 'Offer strip', 'Scheme products', 'Coupon list', 'Reviews', 'Offers sign-up', 'Affiliate invite'].map((t) => `<span class="pl">${t}</span>`).join('')}</div>
            ${zone(`<div class="row" style="gap:5px;padding-top:4px">${['Lookbook', 'Instagram'].map((t) => `<span class="pl dash">${t}</span>`).join('')}</div>`, { p2: 'P2' })}`)}
        </div>
        ${card('Hero slider', `
          ${tabs(['Slide 1', 'Slide 2', 'Slide 3', '+ Add'], 'Slide 1')}
          <div class="g c2"><div class="fld"><span class="fl">Desktop image <b class="req">*</b></span>${ph('1920 × 800', { h: 120 })}</div><div class="fld"><span class="fl">Phone image ${pin(3)}</span>${ph('780 × 1000', { h: 120 })}</div></div>
          ${field('Heading', 'Bathrooms that last a lifetime', { req: true })}
          ${field('Subheading', 'Solid brass faucets with a 5-year warranty')}
          <div class="form">${field('Button text', 'Shop basin mixers')}${field('Button goes to', 'Category · Faucets › Basin mixers', { sel: true })}</div>
          <div class="row">${tog(true, 'Autoplay every 6 seconds')}<span class="sp"></span>${btn('Remove block', { sm: true, danger: true })}</div>`)}
        ${card(`Preview ${pin(4)}`, `<div class="row">${['Phone', 'Desktop'].map((t, i) => `<span class="chip${i === 0 ? ' on' : ''}">${t}</span>`).join('')}</div>
          <div style="border:6px solid var(--fill-2);border-radius:18px;padding:6px;display:flex;flex-direction:column;gap:5px" data-go="st-home">
            <div class="row" style="justify-content:space-between"><span class="sf-logo" style="font-size:9px;padding:2px 5px">AQUAVERDE</span>${icon('cart', 12)}</div>
            ${ph('Hero', { h: 120, cls: '' })}${ph('Benefits', { h: 22 })}<div class="g c3" style="gap:4px">${ph('', { h: 36 })}${ph('', { h: 36 })}${ph('', { h: 36 })}</div>${ph('Bestsellers', { h: 60 })}${ph('Banner', { h: 44 })}${ph('Brand story', { h: 36 })}
          </div>`)}
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-navigation', surface: 'cms', group: 'Content', title: 'Menus',
    purpose: 'The header menu with its large dropdowns, the footer columns and the phone menu.',
    route: '/admin/collections/navigation (one per store)', who: 'Owner, manager, content editor', data: ['navigation'], docs: ['docs/10-storefront-and-vendor-ui.md', 'docs/06-data-model.md'],
    notes: [
      'A menu item can point to a category, a page, a product or any web address. Category links update themselves when a slug changes.',
      'A top item can open a large dropdown with up to four columns and a featured image.',
      'The phone menu reuses the header menu unless the vendor sets a shorter one.',
    ],
    render: () => {
      const item = (t, type, depth = 0, extra = '') => `<div class="row nw" style="padding:7px 8px;margin-left:${depth * 18}px;border:1px solid var(--fill-2);border-radius:5px">${icon('drag', 13)}<span class="sp ${depth ? '' : 'b6'}">${t}</span>${extra}<span class="pl">${type}</span>${btn('', { icon: 'more', sm: true, ghost: true, label: 'More' })}</div>`;
      return shell('cms-navigation', {
        crumbs: [['Content'], ['Menus']], title: 'Menus', actions: btn('Save menus', { pri: true }),
        body: `<div class="g c21">
          ${card(`Header menu ${pin(1)}`, `<div class="col" style="gap:5px">
            ${item('Faucets', 'Category', 0, `${pill('Dropdown, 3 columns')}${pin(2)}`)}${item('Basin mixers', 'Category', 1)}${item('Wall mixers', 'Category', 1)}${item('Kitchen sink mixers', 'Category', 1)}
            ${item('Showers', 'Category')}${item('Sanitaryware', 'Category')}${item('Accessories', 'Category')}${item('Find a dealer', 'Page')}
          </div>${btn('Add menu item', { sm: true, icon: 'plus' })}`)}
          <div class="col">
            ${card('Footer', `<div class="g c3 small">${[['Shop', 'Faucets, Showers, Sanitaryware'], ['Help', 'Track order, Shipping, Returns, Warranty'], ['Company', 'About, Dealers, Downloads']].map(([h, l]) => `<div><b>${h}</b><div class="muted xs">${l}</div></div>`).join('')}</div>${btn('Edit footer', { sm: true })}`)}
            ${card(`Phone menu ${pin(3)}`, `${tog(true, 'Same as header menu')}<span class="help">Switch off to set a shorter menu for phones.</span>`)}
            ${card('Dropdown: Faucets', `<div class="g c2">${field('Columns', '3', { sel: true })}<div class="fld"><span class="fl">Featured image</span>${ph('Matt black range', { h: 64 })}</div></div>`)}
          </div>
        </div>`,
      });
    },
  });

  /* ---------------- Store ---------------- */
  WF.screen({
    id: 'cms-dealers', surface: 'cms', group: 'Store', title: 'Dealers',
    purpose: 'The dealers, distributors and experience centres shown on the store’s dealer locator.',
    route: '/admin/collections/dealers', who: 'Owner, manager', data: ['dealers'], docs: ['docs/08-modules-and-feature-flags.md'],
    notes: [
      'Only dealers marked “shown” appear on the store’s dealer locator. Needs the dealer-locator feature.',
      'Location comes from the pincode, or staff can drop the pin on the map for accuracy.',
      'Large dealer lists come in through CSV import, with the same check-first flow as products.',
    ],
    render: () => shell('cms-dealers', {
      crumbs: [['Store'], ['Dealers']], title: 'Dealers', sub: '214 dealers in 180 cities',
      actions: btn('Import CSV', { icon: 'upload', go: 'cms-import' }) + pin(3) + btn('Add dealer', { pri: true, icon: 'plus' }),
      body: zone(`<div class="g c21">
        <div class="col">
          <div class="row">${field('', '', { ph: 'Name, city or pincode', icon: 'search', cls: 'sp' })}${field('', 'Type: all', { sel: true })}</div>
          ${table(['Dealer', 'Type', 'City', 'Pincode', `Shown ${pin(1)}`], [
            ['<b>Shree Sanitation</b><span class="sub">+91 20xx xxx 412</span>', 'Dealer', 'Pune', '411045', tog(true)],
            ['<b>Aqua Bath Studio</b><span class="sub">+91 79xx xxx 908</span>', 'Experience centre', 'Ahmedabad', '380054', tog(true)],
            ['<b>Patel Hardware and Sanitary</b><span class="sub">+91 28xx xxx 101</span>', 'Dealer', 'Rajkot', '360001', tog(true)],
            ['<b>Kumar Distributors</b><span class="sub">+91 14xx xxx 233</span>', 'Distributor', 'Jaipur', '302001', tog(true)],
            ['<b>Bathline Gallery</b><span class="sub">+91 80xx xxx 650</span>', 'Experience centre', 'Bengaluru', '560038', tog(false)],
          ], { go: null })}
        </div>
        <div class="col">
          ${ph('Map preview', { h: 220 })}
          ${card('Shree Sanitation', `${field('Address', 'Shop 4, Baner Road, Pune 411045')}<div class="form">${field('Latitude', '18.5590')}${field('Longitude', '73.7868')}</div><span class="help">Filled from the pincode. Drag the pin on the map to correct it. ${pin(2)}</span>`)}
        </div>
      </div>`, { flag: 'dealer-locator' }),
    }),
  });

  WF.screen({
    id: 'cms-shipping', surface: 'cms', group: 'Store', title: 'Shipping zones',
    purpose: 'Where the store delivers, what delivery costs, whether cash on delivery is allowed and how long it takes, by state or pincode.',
    route: '/admin/collections/shipping-zones', who: 'Owner, manager', data: ['shipping-zones', 'shipping-rates'], docs: ['docs/09-connectors.md', 'docs/11-orders-payments-gst.md'],
    notes: [
      'The pincode check on product pages, the delivery fee at checkout and whether COD is offered all come from these zones.',
      'Delivery charges take the GST rate of the goods in the order (split by value when an order mixes rates) and the same CGST + SGST or IGST split, worked out on the server.',
      'The delivery fee shoppers pay always comes from these zones (the vendor’s own rate card). With Shiprocket connected (Phase 1), Shiprocket answers the pincode check with COD and delivery dates, and its courier rates are used only to pick a courier when booking. Whether to show live rates at checkout instead is still an open question for you.',
    ],
    render: () => shell('cms-shipping', {
      crumbs: [['Store'], ['Shipping']], title: 'Shipping zones', sub: 'Ships from Morbi, Gujarat 363642',
      actions: btn('Add zone', { pri: true, icon: 'plus' }),
      body: `
        ${table(['Zone', 'Covers', 'Delivery fee', 'Free above', 'COD', 'Delivery time'], [
          ['<b>Gujarat</b>', '1 state', 'Flat ₹99', '₹999', pill('Allowed', 's-ok'), '2 to 3 days'],
          ['<b>West and South</b>', '9 states', 'Flat ₹149', '₹999', pill('Allowed', 's-ok'), '3 to 5 days'],
          ['<b>North and East</b>', '12 states', '₹149 up to 2 kg, then ₹40 per kg', '₹1,999', pill('Allowed', 's-ok'), '4 to 7 days'],
          ['<b>Remote areas</b>', '412 pincodes', 'Flat ₹299', no, pill('Not allowed', 's-off'), '7 to 10 days'],
        ], { go: null })}
        <div class="g c2">
          ${card(`Test a pincode ${pin(1)}`, `<div class="row nw">${field('', '411045', { cls: 'sp' })}${btn('Check')}</div>
            <div class="callout small"><div class="col" style="gap:3px"><b>West and South · Pune, Maharashtra</b><span>Delivery ₹149, free above ₹999</span><span>Cash on delivery allowed</span><span>3 to 5 days</span></div></div>
            <span class="help">Shoppers see the same answer on product pages.</span>`)}
          ${card('Edit zone: West and South', `
            <div class="fld"><span class="fl">States</span><div class="row">${['Maharashtra', 'Goa', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala', 'Madhya Pradesh', 'Chhattisgarh'].map((s) => chip(s, { x: true })).join('')}</div></div>
            <div class="row small"><span class="muted">Fee based on</span>${radio(true, 'Flat')}${radio(false, 'Weight')}${radio(false, 'Order value')}</div>
            <div class="form3">${field('Fee', '₹149')}${field('Free above', '₹999')}${field('Days', '3 to 5')}</div>
            <div class="row">${tog(true, 'Allow cash on delivery')}<span class="sp"></span><span class="xs muted">GST on delivery: same rate as the goods ${pin(2)}</span></div>`)}
        </div>
        <div class="callout small">${icon('truck', 14)}<span class="sp">Shiprocket connected (your own account): pincode check with COD and delivery dates, courier chosen by rate when booking, AWB labels, pickups and tracking. Shoppers still pay the delivery fee from the zones above. Manual shipping stays for your own vans or couriers. ${pin(3)}</span>${btn('Shiprocket settings', { sm: true })}</div>`,
    }),
  });

  WF.screen({
    id: 'cms-payments', surface: 'cms', group: 'Store', title: 'Payments',
    purpose: 'Connect the vendor’s own Razorpay account and set the cash on delivery rules. Money goes straight to the vendor.',
    route: '/admin/collections/connector-configs', who: 'Owner only', data: ['connector-configs', 'site-settings'], docs: ['docs/09-connectors.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Only the owner can see this screen and change keys.',
      'Secrets can be replaced but never viewed again once saved. They are encrypted and never sent to the browser.',
      'Every webhook is signature-checked and handled once, even if Razorpay sends it twice. A wrong webhook secret is the usual cause of this error.',
      'In test mode the store shows a “test payments” notice so nobody is charged by mistake.',
    ],
    render: () => shell('cms-payments', {
      crumbs: [['Store'], ['Payments']], banner: payBanner(), title: `Payments ${pin(1)}`, sub: 'Payments go to your own Razorpay account',
      body: `<div class="g c21">
        ${card('Razorpay', `
          <div class="row">${ph('', { w: 32, h: 32 })}<b>Razorpay</b>${pill('Connected', 's-ok')}<span class="sp"></span><span class="small muted">Mode</span><span class="seg" style="display:inline-flex;border:1px solid var(--wire);border-radius:6px;overflow:hidden"><span style="padding:3px 10px" class="small">Test ${pin(4)}</span><span style="padding:3px 10px;background:var(--ink);color:var(--paper)" class="small">Live</span></span></div>
          <div class="callout alert small">${icon('bell', 14)}<span><b>Webhooks failing since 10:42: signature mismatch.</b> In Razorpay, open Settings, Webhooks, copy the secret, and paste it below. ${pin(3)}</span></div>
          <div class="form">
            ${field('Key ID', '<span class="mono">rzp_live_••••••a91F</span>')}
            <div class="fld"><span class="fl">Key secret ${pin(2)}</span><div class="row nw"><span class="in sp">Saved · hidden</span>${btn('Replace', { sm: true })}</div></div>
            <div class="fld"><span class="fl">Webhook secret</span><div class="row nw"><span class="in sp">Saved · hidden</span>${btn('Replace', { sm: true })}</div></div>
            <div class="fld"><span class="fl">Webhook address to paste in Razorpay</span><div class="row nw"><span class="in sp mono xs">https://admin.tenantecom.in/api/webhooks/razorpay/t_8f21c0</span>${btn('', { icon: 'copy', sm: true, label: 'Copy' })}</div></div>
          </div>
          <div class="row small"><span class="muted">Tick these events in Razorpay:</span>${['payment.captured', 'order.paid', 'refund.processed'].map((e) => `<span class="pl mono">${e}</span>`).join('')}</div>
          <div class="row">${btn('Test connection')}<span class="small muted">Last good webhook today 10:41</span></div>`)}
        <div class="col">
          ${zone(card('Cash on delivery', `${tog(true, 'Offer cash on delivery')}<div class="form">${field('Min. order', '₹499')}${field('Max. order', '₹25,000')}${field('COD fee', '₹49')}</div><span class="help">Only offered in shipping zones that allow COD.</span>
            ${zone(`<div style="padding-top:6px">${tog(false, 'Confirm COD orders on WhatsApp before dispatch')}</div>`, { p2: 'P2' })}`), { flag: 'cod' })}
          ${zone(card('Prepaid discount', `${tog(false, 'Give 2% off when paying online')}<span class="help">Reduces COD returns.</span>`), { p2: true })}
          ${card('Other providers', `<div class="list small"><div>${icon('truck', 14)}<span class="sp">Shiprocket shipping</span>${pill('Connected', 's-ok')}</div><div data-go="cms-messaging">${icon('whatsapp', 14)}<span class="sp">WhatsApp and SMS order updates</span>${icon('chev', 14)}</div></div><span class="help">Your platform contact can switch these on when your plan allows.</span>`)}
        </div>
      </div>`,
    }),
  });

  /* ---------------- Order updates (WhatsApp, SMS, email; docs/18) ---------------- */
  const modePill = (m) => (m === 'on' ? pill('On', 's-ok') : m === 'fb' ? pill('Fallback', 's-warn') : pill('Off', 's-off'));
  const tpl = (wa, sms) => `<span class="row nw" style="gap:4px">${wa ? pill('WhatsApp', 's-ok') : ''}${sms === 1 ? pill('SMS', 's-ok') : sms === 'x' ? pill('SMS rejected', 's-bad') : ''}</span>`;
  WF.screen({
    id: 'cms-notifications', surface: 'cms', group: 'Store', title: 'Order updates',
    purpose: 'What shoppers are told at each step of their order, and on which channel. The owner sets it once; messages then go out by themselves as staff move parcels along.',
    route: '/admin/collections/notification-settings (one per store)', who: 'Owner, manager; order manager read-only', data: ['notification-settings', 'notification-templates', 'notification-logs'], docs: ['docs/18-notifications.md', 'docs/adr/0005-per-vendor-messaging-senders.md'],
    notes: [
      'The steps are fixed in code so templates and reports stay consistent. Vendors choose the channel for each step, not new steps.',
      '“Fallback” sends the SMS only when WhatsApp can’t reach the shopper: no WhatsApp opt-in, template not approved, or not a WhatsApp user.',
      'Meta approves WhatsApp templates and DLT approves SMS templates, separately for each vendor. A step goes out on a channel only once its template is approved; a rejection shows its reason.',
      'Preview fills the template with a sample order. “Send test to my phone” sends the real approved template.',
      'The packed message waits 15 minutes and is dropped if the parcel ships first. Quiet hours hold messages until 09:00, except out for delivery and failed delivery. Caps stop loops and SMS abuse.',
      'Messages come from the vendor’s own WhatsApp number and SMS sender, billed by Meta and MSG91 to the vendor, about ₹1 per prepaid order with these defaults. Planned for the MVP; still waiting on your MVP or Phase 2 call.',
    ],
    render: () => {
      const chan = (ic, name, line, p) => `<div class="card" data-go="cms-messaging"><div class="cb" style="gap:4px"><div class="row nw">${icon(ic, 18)}<b class="sp">${name}</b>${p}</div><span class="xs muted">${line}</span></div></div>`;
      const steps = [
        ['Order confirmed', 'Prepaid and COD versions', 'on', 'on', 'fb', 1, 1],
        ['Packed', 'Sent 15 minutes later', 'off', 'on', 'off', 1, 0],
        ['Shipped', 'Courier, tracking number, date', 'on', 'on', 'fb', 1, 1],
        ['In transit', 'Off: too many messages', 'off', 'off', 'off', 0, 0],
        ['Out for delivery', 'Includes COD amount to keep ready', 'off', 'on', 'on', 1, 1],
        ['Delivery failed', 'Why, and what happens next', 'on', 'on', 'fb', 1, 'x'],
        ['Delivered', 'Invoice and return window', 'on', 'on', 'off', 1, 0],
        ['Order cancelled', 'Refund note when prepaid', 'on', 'on', 'fb', 1, 1],
        ['Refund processed', 'Amount and reference', 'on', 'on', 'fb', 1, 1],
        ['Return approved', 'Pickup instructions', 'on', 'on', 'off', 1, 0],
        ['Return rejected', 'Reason and help contact', 'on', 'on', 'off', 1, 0],
      ];
      return shell('cms-notifications', {
        crumbs: [['Store'], ['Order updates']], title: 'Order updates', sub: `Sent from your own WhatsApp number and SMS sender ${pin(6)}`,
        actions: btn('Send test to my phone', { icon: 'phone' }) + btn('Save', { pri: true }),
        body: `
          <div class="g c3">
            ${chan('whatsapp', 'WhatsApp', 'Connected · 14 of 14 templates approved', pill('Quality high', 's-ok'))}
            ${chan('chat', 'SMS', 'Sender AQUABT · 8 of 9 templates approved', pill('1 rejected', 's-bad'))}
            ${chan('mail', 'Email', 'Sends as Aquaverde, orders@aquaverde.example', pill('Ready', 's-ok'))}
          </div>
          <div class="g c31">
            <div class="col">
              ${card(`Steps and channels ${pin(1)}`, table(['Step', 'Email', 'WhatsApp', `SMS ${pin(2)}`, `Templates ${pin(3)}`],
                steps.map(([t, d, e, w, sm, wa, st]) => [`<b>${t}</b><span class="sub">${d}</span>`, modePill(e), modePill(w), modePill(sm), tpl(wa, st) + (st === 'x' ? '<span class="sub">A variable is longer than 30 characters</span>' : '')]), { go: null }), { flat: true })}
              <div class="callout small">${icon('receipt', 14)}<span>About ₹1 per prepaid order with these settings: 5 WhatsApp messages and 1 SMS, billed to your own Meta and MSG91 accounts.</span></div>
            </div>
            <div class="col">
              ${card(`Preview ${pin(4)}`, `${field('', 'Shipped · WhatsApp', { sel: true })}
                <div class="wa"><div class="wa-h">${ph('', { w: 28, h: 28, cls: 'round' })}<div class="sp"><b class="small">Aquaverde</b><div class="xs muted">Business account</div></div></div>
                  <div class="wa-b">Hi Rahul, your Aquaverde order AQV-10482 has shipped with Delhivery.<br>Tracking number: 1490 2210 0458<br>Expected delivery: Wed 7 Oct<br>We’ll message you again when it is out for delivery.<span class="wa-t">16:05</span></div>
                  <div class="wa-btn">${icon('ext', 13)} Track order</div></div>
                <span class="xs muted">Sample order. Order facts only, no offers, so Meta keeps it a utility message.</span>
                ${field('Test phone', '+91 98xxx xx001')}${btn('Send test to my phone', { block: true, icon: 'phone' })}`)}
              ${card(`Timing and limits ${pin(5)}`, `${field('“Packed” message delay', '15', { suffix: 'minutes' })}
                ${field('Quiet hours', '21:00 to 09:00', { help: 'Out for delivery and failed delivery still go out' })}
                ${tog(true, 'Tick the WhatsApp box at checkout by default')}
                ${field('Email me when a channel breaks', 'priya@aquaverde.example, arjun@aquaverde.example')}
                ${meter('SMS today, limit set by platform', 312, 2000)}
                <span class="xs muted">At most 10 messages per shopper per day.</span>`)}
            </div>
          </div>`,
      });
    },
  });

  WF.screen({
    id: 'cms-messaging', surface: 'cms', group: 'Store', title: 'WhatsApp and SMS',
    purpose: 'The vendor’s own WhatsApp number and SMS sender that order updates go out from, with their health and limits.',
    route: '/admin/collections/connector-configs (messaging)', who: 'Owner only', data: ['connector-configs', 'notification-templates'], docs: ['docs/09-connectors.md', 'docs/18-notifications.md', 'docs/adr/0005-per-vendor-messaging-senders.md'],
    notes: [
      'Shoppers see the vendor’s own WhatsApp name and SMS sender ID, never the platform’s. Each vendor’s accounts, limits and bills are its own, so one vendor’s problem never affects another.',
      'In the MVP the platform team sets this up with the vendor (Meta business account, DLT registration) and enters the details here. A one-click “Connect WhatsApp” comes in Phase 2.',
      'Tokens, secrets and keys are encrypted and can only be replaced, never viewed.',
      'A daily check reads the quality rating and messaging limit. If a channel breaks, updates fall back to SMS or email and the owner gets an email.',
      'The platform sets each store’s daily SMS limit to guard against loops and SMS fraud.',
    ],
    render: () => {
      const secret = (label, p) => `<div class="fld"><span class="fl">${label}${p ? pin(p) : ''}</span><div class="row nw"><span class="in sp">Saved · hidden</span>${btn('Replace', { sm: true })}</div></div>`;
      const hook = (label, url) => `<div class="fld s2"><span class="fl">${label}</span><div class="row nw"><span class="in sp mono xs">${url}</span>${btn('', { icon: 'copy', sm: true, label: 'Copy' })}</div></div>`;
      return shell('cms-messaging', {
        crumbs: [['Store'], ['WhatsApp and SMS']], title: `WhatsApp and SMS ${pin(1)}`, sub: 'Your own accounts, billed to you by Meta and MSG91',
        actions: btn('Order update settings', { icon: 'bell', go: 'cms-notifications' }),
        body: `<div class="g c2">
          ${card('WhatsApp Business', `
            <div class="row nw">${ph('', { w: 34, h: 34, cls: 'round' })}<div class="sp"><b>Aquaverde</b><div class="xs muted">+91 90000 00001 · sending number</div></div>${pill('Connected', 's-ok')}</div>
            ${dl([['Business verification', 'Verified'], [`Quality rating ${pin(4)}`, pill('High', 's-ok')], ['Messaging limit', '2,000 shoppers a day'], ['Templates', '14 approved'], [`Set up ${pin(2)}`, 'By the platform team, 14 Aug']])}
            <div class="form">${field('Phone number ID', '<span class="mono">1093••••••4471</span>')}${field('Business account ID', '<span class="mono">2287••••••1190</span>')}
              ${secret('Access token', 3)}${secret('App secret')}
              ${hook('Webhook address for Meta', 'https://admin.tenantecom.in/api/webhooks/whatsapp/t_8f21c0')}</div>
            <div class="row">${btn('Sync templates', { icon: 'refresh' })}${btn('Send test', { icon: 'phone' })}</div>
            ${zone(`<div class="row" style="padding:6px 0">${btn('Connect WhatsApp in one click', { icon: 'whatsapp' })}<span class="xs muted">Can reuse the number on your WhatsApp Business app</span></div>`, { p2: true })}`)}
          <div class="col">
            ${card('SMS', `
              <div class="row"><b class="sp">MSG91 with DLT</b>${pill('Connected', 's-ok')}</div>
              ${dl([['Sender ID', '<span class="mono">AQUABT</span>'], ['DLT entity ID', '<span class="mono">1201••••••••3381</span>'], ['Templates', '8 approved, 1 rejected'], ['Whitelisted on DLT', 'Store domain, 1800 000 0000']])}
              <div class="form">${secret('Auth key')}${hook('Delivery report address for MSG91', 'https://admin.tenantecom.in/api/webhooks/msg91/t_8f21c0?token=••••')}</div>
              ${meter(`SMS sent today ${pin(5)}`, 312, 2000)}`)}
            ${card('Email', `<div class="row"><b class="sp">Sent by the platform</b>${pill('Domain verified', 's-ok')}</div><span class="small muted">From “Aquaverde” &lt;orders@aquaverde.example&gt;, replies go to care@aquaverde.example.</span>`)}
            ${card('Recent problems', `<div class="list small"><div><span class="mono faint nowrap">28 Sep</span><span class="sp">DLT rejected the SMS template for “Delivery failed”: a variable is longer than 30 characters.</span></div></div>${btn('Fix in Order updates', { sm: true, go: 'cms-notifications' })}`)}
          </div>
        </div>`,
      });
    },
  });

  WF.screen({
    id: 'cms-settings', surface: 'cms', group: 'Store', title: 'Store settings',
    purpose: 'Store name, logos and colour, contact details, GST invoice details, checkout and returns rules, analytics and maintenance mode.',
    route: '/admin/collections/site-settings (one per store)', who: 'Owner, manager', data: ['site-settings', 'tenants (read-only GST fields)', 'counters'], docs: ['docs/06-data-model.md', 'docs/10-storefront-and-vendor-ui.md', 'docs/11-orders-payments-gst.md'],
    notes: [
      'Logos, icon and theme colour are the only look settings a vendor can change. Layout and design live in the vendor’s storefront code.',
      'The 512 px icon and theme colour are used when shoppers install the store on their phone.',
      'GSTIN and legal name come from the vendor record your team created. The next invoice number is shown, never edited, so numbering stays gapless.',
      'Maintenance mode shows shoppers a “back soon” page while staff keep working.',
      'India’s e-commerce rules need a grievance officer’s name and contact on the store, with complaints acknowledged in 48 hours and resolved within a month. The manufacturer details prefill each product’s legal details.',
    ],
    render: () => shell('cms-settings', {
      crumbs: [['Store'], ['Settings']], title: 'Store settings', actions: btn('Save changes', { pri: true }),
      body: `<div class="g" style="grid-template-columns:170px minmax(0,1fr)">
        <div class="col small" style="gap:2px">${['Branding', 'Contact', 'Grievance officer and labels', 'GST and invoices', 'Checkout', 'Returns', 'Announcement bar', 'Search and analytics', 'Store status'].map((t, i) => `<span style="padding:6px 8px;border-radius:5px;${i === 0 ? 'background:var(--fill);font-weight:600' : 'color:var(--ink-2)'}">${t}</span>`).join('')}</div>
        <div class="card"><div class="cb" style="padding:4px 18px">
          <section class="fsec"><header><h4>Branding ${pin(1)}</h4><p>Layout and design are set in code by the platform team.</p></header>
            <div class="form">${field('Store name', 'Aquaverde', { req: true })}${field('Theme colour', `<span class="swt" style="background:var(--ink)"></span> #0F4C5C`)}
              <div class="fld"><span class="fl">Logo</span>${ph('SVG or PNG', { h: 64 })}</div><div class="fld"><span class="fl">Logo for dark backgrounds</span>${ph('SVG or PNG', { h: 64 })}</div>
              <div class="fld"><span class="fl">Browser icon</span>${ph('64 × 64', { h: 64, w: 64 })}</div><div class="fld"><span class="fl">App icon ${pin(2)}</span>${ph('512 × 512', { h: 64, w: 64 })}</div></div></section>
          <section class="fsec"><header><h4>Contact</h4><p>Shown in the footer, on invoices and on the contact page.</p></header>
            <div class="form">${field('Email', 'care@aquaverde.example')}${field('Phone', '1800 000 0000')}${field('WhatsApp number', '+91 90000 00000', { help: 'Used by the WhatsApp button' })}${field('Address', 'Survey 112, NH 8-A, Morbi, Gujarat 363642')}</div></section>
          <section class="fsec"><header><h4>Grievance officer and labels ${pin(5)}</h4><p>Shown on the contact page and in the footer; the label details prefill every product.</p></header>
            <div class="form">${field('Grievance officer', 'Priya Shah, Director', { req: true })}${field('Officer email', 'grievance@aquaverde.example', { req: true })}${field('Manufacturer name and address', 'Aquaverde Ceramics Pvt Ltd, Survey 112, NH 8-A, Morbi, Gujarat 363642', { cls: 's2' })}${field('Consumer care', '1800 000 0000 · care@aquaverde.example')}</div></section>
          <section class="fsec"><header><h4>GST and invoices ${pin(3)}</h4><p>Printed on every invoice and credit note.</p></header>
            <div class="form">${field('GSTIN', '<span class="mono">24AAQCA4821K1Z9</span> · Gujarat (24)', { help: 'Set by the platform team. Ask them to change it.' })}${field('Legal name', 'Aquaverde Ceramics Pvt Ltd')}
              ${field('Order number prefix', 'AQV', { help: 'Set at onboarding' })}${field('Invoice prefix', 'INV', { help: 'Invoice numbers stay within GST’s 16 characters' })}${field('Next invoice number', '<span class="mono">INV/26-27/00483</span>', { help: 'Restarts every financial year' })}
              ${field('Authorised signatory', 'Priya Shah, Director')}<div class="fld"><span class="fl">Signature</span>${ph('Signature image', { h: 44 })}</div>
              ${field('Footer note', 'Goods once sold can be returned within 7 days as per our returns policy.', { cls: 's2' })}</div></section>
          <section class="fsec"><header><h4>Checkout</h4></header>
            <div class="form">${field('Minimum order value', '₹299')}<span class="small muted s2">Guest checkout is on for every store unless the platform team switches it off.</span><span class="small muted s2">Cash on delivery rules are in Payments.</span></div></section>
          <section class="fsec"><header><h4>Returns</h4></header>
            <div class="form">${field('Return window', '7', { suffix: 'days after delivery' })}<div class="fld"><span class="fl">Type</span>${tog(false, 'Exchange only, no refunds')}</div></div></section>
          <section class="fsec"><header><h4>Search and analytics</h4></header>
            <div class="form">${field('Page title pattern', '%s · Aquaverde')}${field('Google Analytics 4 ID', 'G-XXXXXXX')}${field('Meta Pixel ID', '', { ph: 'Optional' })}${field('Google Tag Manager ID', '', { ph: 'Optional' })}</div></section>
          <section class="fsec"><header><h4>Store status ${pin(4)}</h4></header>
            <div>${tog(false, 'Maintenance mode: show shoppers a “back soon” page')}</div></section>
        </div></div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'cms-staff', surface: 'cms', group: 'Store', title: 'Staff and roles',
    purpose: 'The owner invites colleagues and gives each one only the parts of the CMS they need.',
    route: '/admin/collections/users', who: 'Owner only', data: ['users'], docs: ['docs/05-auth-and-roles.md'],
    notes: [
      'Roles come from the permission matrix in the auth doc. One person can have more than one role.',
      'Payment, WhatsApp and SMS keys, staff accounts and affiliate payouts are owner-only, so a manager cannot redirect payments, change the sending number, add accounts or see an affiliate’s bank details.',
      'The plan caps how many staff accounts a store can have.',
    ],
    render: () => shell('cms-staff', {
      crumbs: [['Store'], ['Staff and roles']], title: 'Staff and roles', sub: `6 of 10 staff accounts ${pin(3)}`,
      actions: btn('Invite staff', { pri: true, icon: 'plus' }),
      body: `<div class="g c31">
        <div class="col">
          ${table(['Name', 'Roles', 'Two-step', 'Last sign-in'], [
            ['<b>Priya Shah</b><span class="sub">priya@aquaverde.example</span>', pill('Owner', 's-ok'), pill('On', 's-ok'), 'Today 09:05'],
            ['<b>Arjun Mehta</b><span class="sub">arjun@aquaverde.example</span>', pill('Manager'), pill('On', 's-ok'), 'Yesterday'],
            ['<b>Neha Patel</b><span class="sub">neha@aquaverde.example</span>', pill('Catalog editor'), pill('Off', 's-off'), 'Today 09:12'],
            ['<b>Imran Sheikh</b><span class="sub">imran@aquaverde.example</span>', pill('Order manager'), pill('Off', 's-off'), 'Today 08:40'],
            ['<b>Kavya Rao</b><span class="sub">kavya@aquaverde.example</span>', pill('Content editor'), pill('Off', 's-off'), '28 Sep'],
            ['<b>Support desk</b><span class="sub">support@aquaverde.example</span>', pill('Support'), pill('Off', 's-off'), '30 Sep'],
          ], { go: null })}
          ${card(`What each role can do ${pin(1)}`, table(['', 'Owner', 'Manager', 'Catalog', 'Orders', 'Content', 'Support'], [
            ['Products, categories, import', yes, yes, yes, rd, no, rd],
            ['Pages and menus', yes, yes, no, no, yes, no],
            ['Media library', yes, yes, yes, no, yes, no],
            ['Dealers', yes, yes, no, no, no, no],
            ['Orders, refunds, invoices', yes, yes, no, yes, no, rd],
            ['Customers', yes, yes, no, rd, no, rd],
            ['Enquiries and service', yes, yes, no, yes, no, yes],
            ['Store settings, shipping', yes, yes, no, no, no, no],
            ['Schemes and coupons', yes, yes, rd, rd, rd, rd],
            ['Offer messages', yes, yes, no, no, yes, no],
            ['Abandoned carts', yes, yes, no, no, no, no],
            ['Reviews: approve, reject, reply', yes, yes, no, no, yes, yes],
            ['Affiliates and commission rates', yes, yes, no, rd, no, no],
            ['Record affiliate payouts', yes, no, no, no, no, no],
            ['Order update settings', yes, yes, no, rd, no, no],
            ['Resend a message to a shopper', yes, yes, no, yes, no, no],
            [`Payment, WhatsApp and SMS keys, staff ${pin(2)}`, yes, no, no, no, no, no],
            ['Reports', yes, yes, no, yes, no, no],
          ], { go: null }), { flat: true })}
        </div>
        ${card('Invite staff', `${field('Email', '', { ph: 'name@aquaverde.example' })}
          <div class="fld"><span class="fl">Roles</span><div class="col" style="gap:6px">${[['Manager', 'Everything except payments, payouts and staff'], ['Catalog editor', 'Products, categories, import'], ['Order manager', 'Orders, shipping, enquiries'], ['Content editor', 'Pages, menus, media, offer messages, reviews'], ['Support', 'Answers enquiries, reads orders, moderates reviews']]
            .map(([r, d], i) => `<div>${chk(i === 2, `<b>${r}</b>`)}<div class="xs muted" style="margin-left:22px">${d}</div></div>`).join('')}</div></div>
          ${btn('Send invite', { pri: true, block: true })}`)}
      </div>`,
    }),
  });

  /* ---------------- Insights ---------------- */
  WF.screen({
    id: 'cms-reports', surface: 'cms', group: 'Insights', title: 'Reports',
    purpose: 'Sales for a period, best sellers, and the HSN-wise GST summary the vendor’s accountant needs for GSTR-1.',
    route: '/admin/reports', who: 'Owner, manager, order manager', data: ['orders', 'invoices', 'refunds', 'daily-stats', 'schemes', 'coupons', 'referrals', 'carts'], docs: ['docs/11-orders-payments-gst.md', 'docs/17-roadmap.md'],
    notes: [
      'The GST summary groups sales by HSN code and rate with IGST, CGST and SGST split, and exports as CSV for GSTR-1 filing.',
      'Gross sales are paid and COD-collected orders including GST, before refunds. Refunds are shown separately.',
      'A fuller analytics dashboard (traffic, conversion, cohorts) comes in Phase 2.',
      'Offers shows each scheme and coupon with its orders, sales and discount given, so the vendor sees what an offer cost. Affiliates shows sales and commission by affiliate; abandoned carts shows reminders sent and carts recovered. All come from the nightly rollups.',
    ],
    render: () => shell('cms-reports', {
      crumbs: [['Insights'], ['Reports']], title: 'Reports', sub: 'September 2026',
      actions: field('', '1 to 30 Sep 2026', { sel: true, icon: 'cal' }) + btn('Export orders CSV', { icon: 'down' }),
      body: `
        <div class="g c5">${kpi('Gross sales', '₹33,74,800', 'incl. GST', { pin: 2 })}${kpi('Orders', '1,312', '+8% vs August')}${kpi('Average order', '₹2,572')}${kpi('Refunds', '₹41,200', '12 orders')}${kpi('Paid online', '66%', 'COD 34%')}</div>
        ${card('Daily sales', bars([92, 98, 86, 112, 120, 125, 95, 89, 102, 109, 118, 127, 136, 103, 98, 107, 116, 123, 132, 140, 111, 104, 112, 117, 125, 134, 142, 115, 90, 97], { max: 150, yLabels: ['₹1.5 L', '₹75 K', '0'], xLabels: ['1 Sep', '15 Sep', '30 Sep'], h: 140 }))}
        <div class="g c2">
          ${card('Best sellers', table(['Product', '>Units', '>Sales'], [
            ['Aria single-lever basin mixer', '186', '₹8,62,140'], ['Nimbus wall-hung WC', '31', '₹5,71,950'], ['Rainline overhead shower', '124', '₹3,33,560'], ['Edge countertop basin', '22', '₹1,75,780'], ['Quadra towel rail', '61', '₹1,15,290'],
          ], { go: null }), { flat: true })}
          ${zone(card('Traffic and conversion', `<div class="empty-state">Visitors, conversion rate and repeat buyers</div>`), { p2: true })}
        </div>
        <div class="g c2">
          ${card(`Offers ${pin(4)}`, table(['Scheme or coupon', '>Orders', '>Sales', '>Discount'], [
            ['Rainline launch (live since 15 Sep)', '26', '₹59,540', '₹10,400'],
            ['<span class="mono">AQUA500</span>', '12', '₹2,96,400', '₹6,000'],
            ['<span class="mono">RIYA10</span> (affiliate)', '7', '₹48,300', '₹4,830'],
          ], { go: null }), { flat: true, act: btn('Details', { sm: true, ghost: true, go: 'cms-schemes' }) })}
          ${card('Affiliates and abandoned carts', `<div class="list small">
            <div data-go="cms-affiliates"><span class="sp">Affiliate sales, September</span><b>₹1,84,200 · 38 orders</b></div>
            <div data-go="cms-affiliates"><span class="sp">Commission approved / pending</span><b>₹7,860 / ₹6,420</b></div>
            <div data-go="cms-abandoned"><span class="sp">Carts reminded / recovered</span><b>212 / 37</b></div>
            <div data-go="cms-abandoned"><span class="sp">Recovered sales</span><b>₹2,41,500</b></div></div>`)}
        </div>
        ${card(`GST summary by HSN ${pin(1)}`, table(['HSN', 'Description', 'Rate', '>Taxable value', '>IGST', '>CGST', '>SGST', '>Total tax'], [
          ['<span class="mono">8481</span>', 'Taps, mixers, valves', '18%', '₹12,40,000.00', '₹1,65,600.00', '₹28,800.00', '₹28,800.00', '₹2,23,200.00'],
          ['<span class="mono">6910</span>', 'Ceramic sanitaryware', '18%', '₹16,20,000.00', '₹2,16,000.00', '₹37,800.00', '₹37,800.00', '₹2,91,600.00'],
          ['<b>Total</b>', '', '', '<b>₹28,60,000.00</b>', '<b>₹3,81,600.00</b>', '<b>₹66,600.00</b>', '<b>₹66,600.00</b>', '<b>₹5,14,800.00</b>'],
        ], { go: null }), { flat: true, act: btn('Export for GSTR-1 (CSV)', { sm: true, icon: 'down' }) })}
        <div class="small muted row">${tag.p2()}<span>Full analytics dashboard</span>${pin(3)}</div>`,
    }),
  });

  /* ---------------- Modules (Phase 2 example) ---------------- */
  WF.screen({
    id: 'cms-service', surface: 'cms', group: 'Modules', title: 'Service requests', phase: 2,
    purpose: 'Example of an optional module: warranty registrations and service visits for locks and sanitary vendors, shown only when switched on.',
    route: '/admin/collections/service-requests', who: 'Owner, manager, order manager, support', data: ['warranty-registrations', 'service-requests'], docs: ['docs/08-modules-and-feature-flags.md', 'docs/17-roadmap.md'],
    notes: [
      'This screen and its menu item exist only when the warranty and service-requests features are on for the vendor. Other Phase 2 modules (trade accounts, loyalty points) follow the same pattern.',
      'Shoppers register a product and raise a request from the store. The warranty end date is worked out from the purchase date and the product’s warranty months.',
      'Visit updates go to the shopper by email, and by WhatsApp once the messaging connector exists.',
    ],
    render: () => {
      const sr = (id, t, p, place, w, extra = '') => `<div class="card"><div class="cb" style="gap:3px;padding:10px 12px"><span class="mono xs faint">${id}</span><b class="small">${t}</b><span class="xs muted">${p}</span><span class="xs">${place}</span><span class="xs">${w}</span>${extra}</div></div>`;
      const colm = (h, n, cards) => `<div class="col" style="gap:8px;background:var(--fill);border-radius:8px;padding:10px"><div class="row"><b class="small">${h}</b><span class="mono xs faint">${n}</span></div>${cards}</div>`;
      return shell('cms-service', {
        nav: 'cms-service', crumbs: [['Modules'], ['Service requests']], title: `Service requests ${pin(1)}`, sub: 'Warranty registrations this month: 148',
        actions: btn('New request', { pri: true, icon: 'plus' }),
        body: zone(`
          <div class="g c4">${kpi('Open', '3')}${kpi('Visits booked', '2')}${kpi('First reply', '3 h', 'average')}${kpi('Under warranty', '82%', 'of requests')}</div>
          <div class="g c4" style="align-items:start">
            ${colm('Open', 3, sr('SR-0192', 'Basin mixer leaking at the base', 'Aria · AV-BM-1120', 'Pune 411045', `Warranty until Aug 2031 ${pin(2)}`, btn('Assign', { sm: true })) + sr('SR-0190', 'Low flow from overhead shower', 'Rainline · AV-OS-3200', 'Nashik 422005', 'Warranty until Mar 2030') + sr('SR-0187', 'Soft-close seat not working', 'Nimbus · AV-WH-2041', 'Surat 395007', 'Out of warranty · quote needed'))}
            ${colm('Visit booked', 2, sr('SR-0185', 'Install wall-hung WC', 'Nimbus · AV-WH-2041', 'Pune 411021', 'Thu 8 Oct, 10 to 12 · Ramesh') + sr('SR-0183', 'Diverter stiff to turn', 'Sola · AV-TD-4410', 'Mumbai 400076', 'Fri 9 Oct, 2 to 4 · Ramesh'))}
            ${colm('In progress', 1, sr('SR-0180', 'Replace cartridge', 'Aria · AV-BM-1120', 'Ahmedabad 380015', 'Part sent: AV-SP-0035', `<span class="xs muted">Shopper updated by email ${pin(3)}</span>`))}
            ${colm('Resolved', 4, sr('SR-0176', 'Aerator blocked', 'Aria · AV-BM-1120', 'Rajkot 360005', 'Closed 30 Sep'))}
          </div>`, { p2: true, flag: ['warranty', 'service-requests'] }),
      });
    },
  });

  WF.screen({
    id: 'cms-trade', surface: 'cms', group: 'Modules', title: 'Trade accounts', phase: 2,
    purpose: 'Phase 2: dealers, retailers, wholesalers and interior designers who buy on trade terms, their applications, price lists, credit and anniversary offers.',
    route: '/admin/collections/trade-accounts', who: 'Owner, manager; order manager and support read-only', data: ['trade-accounts', 'price-lists', 'quotes', 'schemes', 'coupons'], docs: ['docs/17-roadmap.md', 'docs/06-data-model.md', 'docs/05-auth-and-roles.md', 'docs/08-modules-and-feature-flags.md'],
    notes: [
      'Four partner types, each switched on per vendor: dealers (dealer price list, credit, quotes, statements), retailers (retailer prices for resale, GST invoice with their GSTIN), wholesalers (bulk tiers, higher minimum quantities, credit) and interior designers (trade price on their own orders plus commission on client orders).',
      'Partners apply from the store with their business and GSTIN; staff approve and pick the price list and terms. Trade prices show only to approved, signed-in partners.',
      'Dealer anniversary: on each partner’s anniversary with the brand, a personal single-use code is made and sent by email and WhatsApp, valid for the set number of days.',
      'Trade schemes are normal schemes aimed at one or more partner types, such as a Diwali slab scheme for dealers.',
    ],
    render: () => shell('cms-trade', {
      nav: 'cms-trade', crumbs: [['Modules'], ['Trade accounts']], title: `Trade accounts ${pin(1)}`, sub: '64 approved · 3 applications',
      actions: btn('Price lists') + btn('Add account', { pri: true, icon: 'plus' }),
      body: zone(`
        ${tabs([['All', null, 64], ['Dealers', null, 41], ['Retailers', null, 12], ['Wholesalers', null, 5], ['Interior designers', null, 6], ['Applications', null, 3]], 'All')}
        <div class="g c21">
          ${table(['Account', 'Type', 'City', 'Price list', 'Credit', '>Orders, 90 d', `Anniversary ${pin(3)}`, 'Status'], [
            ['<b>Shree Sanitation</b><span class="sub mono">27AAKFS1234L1Z2</span>', 'Dealer', 'Pune', 'Dealer A', '₹5 L · 30 days', '14', '12 Nov · 12 years', pill('Approved', 's-ok')],
            ['<b>Patel Hardware and Sanitary</b>', 'Retailer', 'Rajkot', 'Retailer', 'Prepaid', '6', no, pill('Approved', 's-ok')],
            ['<b>Kumar Distributors</b>', 'Wholesaler', 'Jaipur', 'Wholesale tiers', '₹15 L · 45 days', '22', '3 Jan · 8 years', pill('Approved', 's-ok')],
            ['<b>Studio Ananta</b>', 'Interior designer', 'Bengaluru', 'Designer, 12% off', 'Prepaid', '5', no, `${pill('Approved', 's-ok')}<span class="sub">4% on client orders</span>`],
            ['<b>Om Sai Traders</b><span class="sub">applied 2 Oct</span>', 'Dealer', 'Nagpur', no, no, no, no, `${btn('Approve', { sm: true, pri: true })} ${pin(2)}`],
          ], { go: null })}
          <div class="col">
            ${card('Dealer anniversary', `<div class="list small"><div><div class="col sp" style="gap:0"><b>Shree Sanitation · 12 years on 12 Nov</b><span class="muted">Code SHREE12 · ₹5,000 off orders above ₹50,000 · valid 15 days · sent by email and WhatsApp</span></div></div></div>${tog(true, 'Send anniversary offers automatically')}`)}
            ${card(`Trade schemes ${pin(4)}`, `<div class="list small"><div data-go="cms-schemes"><span class="sp">Diwali dealer slab: 2% extra above ₹2 L, 3% above ₹5 L</span>${pill('Scheduled', 's-warn')}</div></div>`)}
          </div>
        </div>`, { p2: true, flag: 'b2b' }),
    }),
  });
})();
