/* Super admin: our team's panel for vendors, plans, subscriptions and per-vendor features. */
(function () {
  'use strict';
  const { icon, btn, pill, ph, field, tog, chk, radio, chip, tabs, table, card, kpi, meter, bars, zone, tag, pin } = WF;
  const yes = icon('check', 14);
  const no = '<span class="faint">—</span>';

  WF.surface('sa', {
    label: 'Super admin',
    width: 1120,
    about: 'Your team’s panel at <code>admin.&lt;platform-domain&gt;</code>. Onboard vendors, set plans and subscriptions, switch features and connectors on per vendor, and manage any store’s data end to end with “Manage store”. Storefront design is not edited here; it lives in code. It is the same Payload admin app as the vendor CMS, with the same theme.',
  });

  WF.navs.sa = {
    logo: `<span class="av">TE</span><div><b>TenantEcom</b><small>Platform admin</small></div>`,
    search: 'Search vendors or GSTIN',
    top: `<span class="row nw">${icon('bell', 16)}<span class="av">RV</span><span class="nowrap">Rohit Verma · Super admin</span></span>`,
    groups: [
      { items: [['Dashboard', 'sa-dashboard', 'chart']] },
      { h: 'Vendors', items: [['All vendors', 'sa-vendors', 'store'], ['New vendor', 'sa-vendor-new', 'plus']] },
      { h: 'Billing', items: [['Plans', 'sa-plans', 'layers'], ['Subscriptions', 'sa-subscriptions', 'receipt']] },
      { h: 'Platform', items: [['Team and access', 'sa-team', 'users'], ['Audit log', '', 'file', { tag: tag.later() }]] },
    ],
  };

  const shell = (id, cfg) => WF.admin(Object.assign({ surface: 'sa', id }, cfg));

  const vendorTabs = [['Overview', 'sa-vendor'], ['Features', 'sa-vendor-features'], ['Connectors', 'sa-vendor-connectors'], ['Domains', 'sa-vendor-domains'], ['Billing', 'sa-vendor-billing'], ['Staff', 'sa-vendor-staff']];
  const vendorHead = (tab, pins = {}) => `
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:16px">
      <div class="row nw" style="gap:12px">${ph('Logo', { w: 52, h: 52 })}
        <div><h2 style="font-size:20px;font-weight:600">Aquaverde Sanitary</h2>
          <div class="row small muted" style="margin-top:4px">${pill('Store active', 's-ok')}${pill('Growth plan')}<span class="mono">aquaverde.tenantecom.in</span><span>Sanitary · Morbi, Gujarat</span></div></div></div>
      <div class="row">${btn('View store', { icon: 'ext', go: 'st-home' })}${btn('Manage store', { pri: true, icon: 'gear', go: 'cms-dashboard' })}${btn('View as support', { icon: 'eye', go: 'cms-dashboard' })}${pins.support ? pin(pins.support) : ''}${btn('Suspend store', { danger: true })}${pins.suspend ? pin(pins.suspend) : ''}</div>
    </div>
    ${tabs(vendorTabs, tab)}`;
  const vendorShell = (id, tab, body, pins) =>
    shell(id, { nav: 'sa-vendors', crumbs: [['Vendors', 'sa-vendors'], ['Aquaverde Sanitary', 'sa-vendor'], [tab]], body: vendorHead(tab, pins) + body });

  const dl = (pairs) => `<div class="g c2" style="gap:10px 18px">${pairs.map(([k, v]) => `<div><div class="fl">${k}</div><div>${v}</div></div>`).join('')}</div>`;

  /* ---------------- Access ---------------- */
  WF.screen({
    id: 'sa-login', surface: 'sa', group: 'Access', title: 'Sign in and two-step check',
    purpose: 'One sign-in page for your team and for every vendor’s staff. After sign-in, the account’s role decides which panel opens.',
    route: '/admin/login', who: 'Platform admins, support, vendor staff', data: ['users'], docs: ['docs/05-auth-and-roles.md'],
    notes: [
      'Same Payload admin login for everyone. Platform admins land on the platform dashboard; vendor staff land on their own store’s dashboard and never see other stores.',
      'Two-step verification (authenticator app) is required for platform admins and recommended for vendor owners.',
      'After 5 wrong passwords the account locks for 15 minutes. Messages never reveal whether an email has an account. The session lasts 8 hours in an HTTP-only cookie.',
    ],
    render: () => `<div style="min-height:800px;background:var(--fill);display:flex;align-items:center;justify-content:center;gap:28px;padding:40px;flex-wrap:wrap">
      <div class="card" style="width:360px"><div class="cb" style="padding:28px;gap:14px">
        <div class="row"><span class="av">TE</span><b>TenantEcom admin</b></div>
        <h3 style="font-size:20px">Sign in ${pin(1)}</h3>
        ${field('Email', 'rohit@tenantecom.in')}
        ${field('Password', '••••••••••••', { suffix: 'Show' })}
        ${chk(false, 'Keep me signed in on this device')}
        ${btn('Sign in', { pri: true, block: true, lg: true })}
        <span class="small muted">Forgot password?</span>
        <div class="callout small">${icon('lock', 14)}<span>Too many attempts. Try again in 15 minutes, or reset your password. ${pin(3)}</span></div>
      </div></div>
      <div class="card" style="width:360px"><div class="cb" style="padding:28px;gap:14px">
        <span class="sec-t">Step 2 of 2</span>
        <h3 style="font-size:20px">Two-step verification ${pin(2)}</h3>
        <p class="muted small">Enter the 6-digit code from your authenticator app.</p>
        <div class="otp"><span class="f">4</span><span class="f">8</span><span class="f">1</span><span></span><span></span><span></span></div>
        ${btn('Verify and continue', { pri: true, block: true, lg: true, go: 'sa-dashboard' })}
        <span class="small muted">Use a recovery code instead</span>
        <div class="hr"></div>
        <span class="small muted">Vendor staff who verify land on their store: ${btn('see CMS dashboard', { sm: true, ghost: true, go: 'cms-dashboard', after: 'chev' })}</span>
      </div></div>
    </div>`,
  });

  /* ---------------- Overview ---------------- */
  const gmv = [6.2, 7.1, 6.8, 7.9, 8.4, 9.1, 7.2, 6.9, 7.6, 8.1, 8.8, 9.4, 10.2, 7.8, 7.5, 8.2, 8.9, 9.6, 10.4, 11.1, 8.6, 8.1, 8.7, 9.3, 9.9, 10.8, 11.6, 9.2, 8.8, 9.5];
  WF.screen({
    id: 'sa-dashboard', surface: 'sa', group: 'Overview', title: 'Platform dashboard',
    purpose: 'The first screen your team sees: how many stores are live, what the platform earns, total sales across stores, and anything that needs action.',
    route: '/admin', who: 'Super admin; support sees it read-only', data: ['tenants', 'subscriptions', 'orders (all tenants)', 'connector-configs', 'tenant-domains'], docs: ['docs/17-roadmap.md', 'docs/15-scalability-and-ops.md'],
    notes: [
      'MRR comes from subscriptions; GMV is the sum of paid orders across all stores, stored in paise. Suggest a nightly rollup per store so this page stays fast at 500 stores instead of scanning every order.',
      'Needs attention collects past-due subscriptions, failing connectors (<code>connector-configs.lastError</code>), rejected or paused WhatsApp and SMS templates, domains waiting for SSL and stores above 90% of a plan limit. Each row opens the right vendor tab.',
      'The support role sees the same page without edit buttons.',
    ],
    render: () => shell('sa-dashboard', {
      crumbs: [['Dashboard']], title: 'Good morning, Rohit', sub: 'Friday, 2 October 2026 · all stores',
      actions: btn('New vendor', { pri: true, icon: 'plus', go: 'sa-vendor-new' }),
      body: `
        <div class="g c5">
          ${kpi('Live stores', '42', '38 paying · 4 on trial', { go: 'sa-vendors' })}
          ${kpi('MRR', '₹3.70 L', 'before GST', { pin: 1, go: 'sa-subscriptions' })}
          ${kpi('Past due', '2', '₹17,697.64 outstanding', { go: 'sa-subscriptions' })}
          ${kpi('Orders today', '1,284', 'across all stores')}
          ${kpi('GMV, September', '₹2.62 Cr', 'paid orders, incl. GST')}
        </div>
        <div class="g c21">
          ${card('Sales across all stores, September', bars(gmv, { max: 12, yLabels: ['₹12 L', '₹6 L', '0'], xLabels: ['1 Sep', '15 Sep', '30 Sep'], h: 150 }), { act: `<span class="seg-mini row small muted">Daily GMV ${icon('chevd', 12)}</span>` })}
          ${card('Needs attention', `<div class="list">
            ${[
              ['Aquaverde Sanitary', 'Razorpay webhook failing since 10:42', pill('Payments', 's-bad'), 'sa-vendor-connectors'],
              ['Ironclad Locks', 'Meta rejected the WhatsApp “Shipped” template', pill('Messaging', 's-warn'), 'sa-vendor-connectors'],
              ['Loomhouse Apparel', 'Subscription past due for 9 days', pill('Billing', 's-warn'), 'sa-subscriptions'],
              ['Hingewell Hardware', 'shop.hingewell.com waiting for SSL', pill('Domain', 's-warn') + tag.p2('P2'), 'sa-vendor-domains'],
              ['Loomhouse Apparel', '1,880 of 2,000 products used (94%)', pill('Limit', 's-warn'), 'sa-vendors'],
              ['Brasskraft Fittings', 'Trial ends Wed, 14 Oct', pill('Trial', 's-off'), 'sa-subscriptions'],
            ].map(([v, t, p, g]) => `<div data-go="${g}"><div class="col" style="gap:0;flex:1"><b class="small">${v}</b><span class="small muted">${t}</span></div>${p}</div>`).join('')}
          </div>`, { pin: 2 })}
        </div>
        <div class="g c21">
          ${card('Top stores this month', table(['Vendor', 'Industry', '>Orders', '>GMV', '>vs August'], [
            ['Loomhouse Apparel', 'Clothing', '2,104', '₹46.8 L', '+12%'],
            ['Aquaverde Sanitary', 'Sanitary', '1,312', '₹33.7 L', '+8%'],
            ['Hingewell Hardware', 'Hardware', '903', '₹28.1 L', '−3%'],
            ['Ironclad Locks', 'Locks', '742', '₹19.6 L', '+21%'],
            ['Teakline Decor', 'Decor', '286', '₹12.4 L', '+5%'],
          ], { go: 'sa-vendor' }), { flat: true })}
          ${card('Recently onboarded', `<div class="list">
            <div data-go="sa-vendor"><div class="col" style="gap:0;flex:1"><b class="small">Brasskraft Fittings</b><span class="small muted">Trial · products imported 212</span></div>${pill('Trialing', 's-warn')}</div>
            <div><div class="col" style="gap:0;flex:1"><b class="small">Doorcraft Interiors</b><span class="small muted">Owner has not accepted the invite</span></div>${btn('Resend invite', { sm: true })}</div>
            <div data-go="sa-vendor"><div class="col" style="gap:0;flex:1"><b class="small">Ironclad Locks</b><span class="small muted">Live since 18 Sep</span></div>${pill('Active', 's-ok')}</div>
          </div>`, { pin: 3 })}
        </div>`,
    }),
  });

  /* ---------------- Vendors ---------------- */
  const prod = (u, m) => {
    const pct = Math.round((u / m) * 100);
    return `<div style="min-width:120px">${meter('', u, m)}${pct >= 90 ? `<span class="xs b6">${pct}% used</span>` : ''}</div>`;
  };
  WF.screen({
    id: 'sa-vendors', surface: 'sa', group: 'Vendors', title: 'All vendors',
    purpose: 'Every vendor store on the platform, with its plan, subscription state and how much of its plan it uses.',
    route: '/admin/collections/tenants', who: 'Super admin; support read-only', data: ['tenants', 'subscriptions', 'plans'], docs: ['docs/04-multi-tenancy.md', 'docs/06-data-model.md'],
    notes: [
      'Store status (draft, active, suspended, archived) is separate from subscription status (trialing, active, past due, paused, cancelled), so a store can be live while its payment is late.',
      'Products used against the plan’s product limit. At 90% the row is flagged and the vendor sees a warning in their CMS.',
      'Clicking a row opens the vendor detail tabs. New vendor runs the same steps as the <code>create-tenant</code> script.',
    ],
    render: () => shell('sa-vendors', {
      crumbs: [['Vendors']], title: 'Vendors', sub: '46 stores · 42 live',
      actions: btn('Export CSV', { icon: 'down' }) + btn('New vendor', { pri: true, icon: 'plus', go: 'sa-vendor-new' }),
      body: `
        ${tabs([['All', null, 46], ['Active', null, 42], ['Draft', null, 1], ['Suspended', null, 1], ['Archived', null, 2]], 'All')}
        <div class="row">${field('', '', { ph: 'Search name, slug or GSTIN', icon: 'search', cls: 'sp' })}${field('', 'Plan: all', { sel: true })}${field('', 'Industry: all', { sel: true })}${field('', 'Subscription: all', { sel: true })}</div>
        ${table(['Vendor', 'Industry', 'Plan', `Store ${pin(1)}`, 'Subscription', `Products ${pin(2)}`, '>Orders, 30 days', 'Created'], [
          [`<b>Aquaverde Sanitary</b><span class="sub mono">aquaverde.tenantecom.in</span>`, 'Sanitary', 'Growth', pill('Active', 's-ok'), pill('Active', 's-ok'), prod(1240, 2000), '1,312', '12 Aug 2026'],
          [`<b>Loomhouse Apparel</b><span class="sub mono">loomhouse.in</span>`, 'Clothing', 'Growth', pill('Active', 's-ok'), pill('Past due', 's-bad'), prod(1880, 2000), '2,104', '3 Jun 2026'],
          [`<b>Hingewell Hardware</b><span class="sub mono">hingewell.com</span>`, 'Hardware', 'Enterprise', pill('Active', 's-ok'), pill('Active', 's-ok'), prod(4620, 10000), '903', '21 Apr 2026'],
          [`<b>Ironclad Locks</b><span class="sub mono">ironclad.tenantecom.in</span>`, 'Locks', 'Growth', pill('Active', 's-ok'), pill('Active', 's-ok'), prod(486, 2000), '742', '18 Sep 2026'],
          [`<b>Teakline Decor</b><span class="sub mono">teakline.tenantecom.in</span>`, 'Decor', 'Starter', pill('Active', 's-ok'), pill('Active', 's-ok'), prod(318, 500), '286', '9 Jul 2026'],
          [`<b>Brasskraft Fittings</b><span class="sub mono">brasskraft.tenantecom.in</span>`, 'Hardware', 'Starter', pill('Active', 's-ok'), pill('Trialing', 's-warn'), prod(212, 500), '38', '30 Sep 2026'],
          [`<b>Doorcraft Interiors</b><span class="sub">No domain yet</span>`, 'Hardware', 'Starter', pill('Draft', 's-off'), no, prod(0, 500), '0', '1 Oct 2026'],
          [`<b>Kalakriti Home</b><span class="sub mono">kalakriti.tenantecom.in</span>`, 'Decor', 'Growth', pill('Suspended', 's-bad'), pill('Paused', 's-off'), prod(402, 2000), '0', '12 Mar 2026'],
        ], { go: 'sa-vendor' })}
        <div class="row small muted"><span>Showing 1–8 of 46</span><span class="sp"></span>${btn('Previous', { sm: true })}${btn('Next', { sm: true })}</div>
        <p class="small muted">Row clicks open the vendor detail ${pin(3)}</p>`,
    }),
  });

  WF.screen({
    id: 'sa-vendor-new', surface: 'sa', group: 'Vendors', title: 'New vendor',
    purpose: 'Your team onboards a manufacturer in one form: business and GST details, store address, plan, starting features and the owner’s login.',
    route: '/admin/collections/tenants/create', who: 'Super admin', data: ['tenants', 'tenant-domains', 'subscriptions', 'feature-flags', 'users', 'site-settings'], docs: ['docs/04-multi-tenancy.md', 'docs/08-modules-and-feature-flags.md', 'docs/10-storefront-and-vendor-ui.md'],
    notes: [
      'GSTIN fills in the PAN and the GST state code. The state code decides CGST plus SGST (same state) or IGST (other state) on every invoice.',
      'The slug is permanent. It becomes the subdomain and the name of the vendor’s UI folder in code.',
      'Choosing an industry pre-selects features from the preset, but only those the chosen plan allows.',
      'There is no self sign-up. The owner gets an emailed invite to set a password and can then invite their own staff.',
      'Creating also sets up store settings, invoice and order counters, default tax rates and an empty navigation, the same as the <code>create-tenant</code> script.',
    ],
    render: () => shell('sa-vendor-new', {
      nav: 'sa-vendor-new', crumbs: [['Vendors', 'sa-vendors'], ['New vendor']], title: 'New vendor', sub: 'Creates a draft store. It goes live when you switch the store to active.',
      body: `<div class="g c31">
        <div class="card"><div class="cb" style="padding:4px 18px">
          <section class="fsec"><header><h4><span class="sec-t">1</span> Business</h4><p>Legal details used on GST invoices.</p></header>
            <div class="form">
              ${field('Store name', 'Brasskraft Fittings', { req: true })}${field('Legal name', 'Brasskraft Industries Pvt Ltd', { req: true })}
              ${field('GSTIN', '24AAKCB1234F1Z5', { req: true, pin: 1, help: 'PAN and state fill in from the GSTIN' })}${field('PAN', 'AAKCB1234F', { help: 'From GSTIN' })}
              ${field('State', 'Gujarat (24)', { sel: true })}${field('Registered address', 'Plot 41, GIDC Phase 2, Dared, Jamnagar 361004')}
              <div class="fld s2"><span class="fl">Industry <b class="req">*</b></span><div class="row">${['Sanitary', 'Locks', 'Hardware', 'Decor', 'Clothing', 'Other'].map((t) => chip(t, { on: t === 'Hardware' })).join('')}</div></div>
              ${field('Support email', 'care@brasskraft.example')}${field('Support phone', '1800 000 0000')}
            </div></section>
          <section class="fsec"><header><h4><span class="sec-t">2</span> Store</h4><p>Address and defaults.</p></header>
            <div class="form">
              ${field('Slug', 'brasskraft', { req: true, pin: 2, help: 'Store address: brasskraft.tenantecom.in · cannot be changed later' })}${field('Default language', 'English', { sel: true, tag: ' ' + tag.p2('more in P2') })}
              ${field('Currency', 'INR (₹)', { sel: true, help: 'Fixed to INR in the MVP' })}${field('Time zone', 'Asia/Kolkata', { sel: true })}
              <div class="callout s2 small">${icon('layers', 14)}<span>Storefront design: uses the shared default kit until our team adds <code>src/storefront/vendors/brasskraft</code>. Design is never set from this panel.</span></div>
            </div></section>
          <section class="fsec"><header><h4><span class="sec-t">3</span> Plan and trial</h4><p>The plan caps features, connectors and limits.</p></header>
            <div class="col">
              <div class="g c3">${[['Starter', '₹4,999 / month', '500 products · 3 staff', true], ['Growth', '₹9,999 / month', '2,000 products · 10 staff', false], ['Enterprise', '₹24,999 / month', '10,000 products · 30 staff', false]]
                .map(([n, p, l, on]) => `<div class="card" style="${on ? 'border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)' : ''}"><div class="cb" style="gap:4px">${radio(on, `<b>${n}</b>`)}<span class="small">${p}</span><span class="xs muted">${l}</span></div></div>`).join('')}</div>
              <div class="form">${field('Free trial', '14 days', { sel: true })}<div class="fld"><span class="fl">Billing</span><div class="row">${radio(true, 'Manual (bank transfer, UPI)')}${zone(radio(false, 'Razorpay Subscriptions'), { p2: 'P2' })}</div></div></div>
            </div></section>
          <section class="fsec"><header><h4><span class="sec-t">4</span> Starting features ${pin(3)}</h4><p>Preset for <b>Hardware</b>. You can change these any time.</p></header>
            <div class="g c2" style="gap:10px 24px">
              ${[['Guest checkout', 1], ['Cash on delivery', 1], ['Enquiries inbox', 1], ['Enquire-only products', 1, 'preset'], ['Dealer locator', 1, 'preset'], ['Downloads page', 1, 'preset'], ['WhatsApp button', 1], ['Pincode check', 1], ['Product videos', 1], ['Size guide', 0], ['Schemes and offers', 1], ['Coupons', 1], ['Wishlist', 1], ['Reviews', 1], ['Offer messages', 1], ['Abandoned cart reminders', 1]]
                .map(([t, on, p]) => `<div class="row" style="justify-content:space-between">${tog(!!on, t)}${p ? pill('preset', 'dash') : ''}</div>`).join('')}
              <div class="row" style="justify-content:space-between;padding:4px 0">${tog(false, 'Affiliate program', { lock: true })}<span class="xs muted">Growth plan · in the Hardware preset</span></div>
              ${zone(`<div class="row" style="justify-content:space-between;padding:4px 0">${tog(false, 'Trade accounts', { lock: true })}<span class="xs muted">Enterprise plan</span></div>`, { p2: 'P2' })}
              ${zone(`<div class="row" style="justify-content:space-between;padding:4px 0">${tog(false, 'Product compare', { lock: true })}<span class="xs muted">Growth plan</span></div>`, { p2: 'P2' })}
            </div></section>
          <section class="fsec"><header><h4><span class="sec-t">5</span> Owner login ${pin(4)}</h4><p>The owner can add their own staff later.</p></header>
            <div class="form">
              ${field('Owner name', 'Hitesh Vora', { req: true })}${field('Owner email', 'hitesh@brasskraft.example', { req: true })}
              ${field('Mobile', '+91 90000 00000')}<div class="fld"><span class="fl">Security</span>${tog(true, 'Ask owner to set up two-step verification')}</div>
              <div class="s2">${chk(true, 'Email the invite now')}</div>
            </div></section>
        </div></div>
        <div class="col">
          ${card(`Will be created ${pin(5)}`, `<div class="list small">
            <div>${icon('store', 14)}<span>Draft store <b>Brasskraft Fittings</b></span></div>
            <div>${icon('globe', 14)}<span class="mono">brasskraft.tenantecom.in</span></div>
            <div>${icon('receipt', 14)}<span>Starter plan, 14-day trial</span></div>
            <div>${icon('layers', 14)}<span>15 features on from the defaults and the Hardware preset</span></div>
            <div>${icon('gear', 14)}<span>Store settings, counters, tax rates, empty menu</span></div>
            <div>${icon('mail', 14)}<span>Invite to hitesh@brasskraft.example</span></div>
          </div>${btn('Create vendor', { pri: true, block: true, go: 'sa-vendor' })}${btn('Save as draft', { block: true })}`)}
          <div class="callout small">${icon('file', 14)}<span>Next steps for our team: start the WhatsApp (Meta) and SMS (DLT) approvals on day one, because they take a few days. Then the vendor UI folder, CSV import, Razorpay keys and shipping zones. See <code>docs/10</code> and <code>docs/18</code>.</span></div>
        </div>
      </div>`,
    }),
  });

  WF.screen({
    id: 'sa-vendor', surface: 'sa', group: 'Vendor detail', title: 'Vendor overview',
    purpose: 'One vendor at a glance: business details, plan usage, store health and recent changes, with tabs for everything you control.',
    route: '/admin/collections/tenants/:id', who: 'Super admin; support read-only', data: ['tenants', 'subscriptions', 'plans', 'connector-configs', 'audit-logs'], docs: ['docs/04-multi-tenancy.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Suspend shows shoppers a “store unavailable” page and blocks staff edits. Nothing is deleted, and resuming brings the store back as it was.',
      '“Manage store” (super admins only) opens the vendor’s CMS with full edit rights: products, categories, customers, affiliates, orders, payments, inventory, schemes, coupons, commissions, order updates and offer messages, reports, pages and menus, staff and roles, and settings. A reason is asked once, the session lasts 2 hours, a banner shows on every CMS page, and every change is written to the audit log, which the vendor owner can see. “View as support” opens the same CMS read-only, also logged.',
      'Usage is measured against the plan’s limits. Vendors see the same meters in their CMS.',
    ],
    render: () => vendorShell('sa-vendor', 'Overview', `
      <div class="g c21">
        <div class="col">
          ${card('Business details', dl([
            ['Legal name', 'Aquaverde Ceramics Pvt Ltd'], ['GSTIN', '<span class="mono">24AAQCA4821K1Z9</span>'],
            ['PAN', '<span class="mono">AAQCA4821K</span>'], ['GST state', 'Gujarat (24)'],
            ['Registered address', 'Survey 112, National Highway 8-A, Morbi, Gujarat 363642'], ['Industry', 'Sanitary'],
            ['Support email', 'care@aquaverde.example'], ['WhatsApp', '+91 90000 00000'],
            ['Created', '12 Aug 2026 by Ananya Iyer'], ['Went live', '20 Aug 2026'],
          ]), { act: btn('Edit', { sm: true }) })}
          ${card(`Manage this store ${pin(2)}`, `<div class="row" style="gap:5px">${['Products', 'Categories', 'Customers', 'Affiliates', 'Orders', 'Payments', 'Inventory', 'Schemes', 'Coupons', 'Commissions', 'Order updates and offers', 'Reports', 'Pages and menus', 'Staff and roles', 'Settings'].map((t) => `<span class="pl">${t}</span>`).join('')}${zone(`<span class="pl dash">Dealers, retailers, wholesalers, designers</span>`, { p2: 'P2' })}</div>
            <div class="row nw">${field('', '', { ph: 'Reason, for example: vendor asked us to set up the Diwali scheme', cls: 'sp' })}${btn('Manage store', { pri: true, go: 'cms-dashboard' })}</div><span class="xs muted">Full edit for 2 hours. Every change is logged with your name and this reason.</span>`)}
          ${card('Internal notes', field('', '', { ta: true, ph: 'Visible to our team only. For example: prefers WhatsApp, renewal call in March.' }))}
          ${card('Recent changes', `<div class="list small">
            <div><span class="faint mono nowrap">2 Oct</span><span>Rohit managed the store: added coupon <b>AQUA500</b> (vendor asked by phone)</span></div>
            <div><span class="faint mono nowrap">28 Sep</span><span>Ananya switched on <b>Dealer locator</b></span></div>
            <div><span class="faint mono nowrap">19 Aug</span><span>Priya (owner) added live Razorpay keys</span></div>
            <div><span class="faint mono nowrap">15 Aug</span><span>Plan changed from Starter to Growth</span></div>
            <div><span class="faint mono nowrap">12 Aug</span><span>Store created with the Sanitary preset</span></div>
          </div>`)}
        </div>
        <div class="col">
          ${card(`Plan usage ${pin(3)}`, `${meter('Products', 1240, 2000)}${meter('Staff users', 6, 10)}${meter('Storage', 7.8, 20, { unit: 'GB', fmt: (v) => v })}${meter('Orders this month', 64, 5000)}`)}
          ${card('Store health', `<div class="list small">
            <div>${icon('cart', 14)}<span class="sp">Last order</span><span>4 min ago</span></div>
            <div data-go="sa-vendor-connectors">${icon('card', 14)}<span class="sp">Razorpay, live</span>${pill('Webhook failing', 's-bad')}</div>
            <div data-go="sa-vendor-domains">${icon('globe', 14)}<span class="sp">Primary domain</span><span class="mono xs">aquaverde.tenantecom.in</span></div>
            <div>${icon('layers', 14)}<span class="sp">Storefront design</span><span class="mono xs">vendors/aquaverde</span></div>
          </div>`)}
        </div>
      </div>`, { support: 2, suspend: 1 }),
  });

  const featureRow = (name, key, inPlan, on, extra = '') => [
    `<b>${name}</b>${extra}`, `<span class="mono xs">${key}</span>`,
    inPlan === true ? yes : `<span class="row nw xs">${icon('lock', 13)}${inPlan}</span>`,
    tog(on, '', { lock: inPlan !== true }),
  ];
  WF.screen({
    id: 'sa-vendor-features', surface: 'sa', group: 'Vendor detail', title: 'Vendor features',
    purpose: 'Switch optional features on or off for one vendor, within what their plan allows.',
    route: '/admin/collections/tenants/:id (Features tab)', who: 'Super admin', data: ['feature-flags', 'plans'], docs: ['docs/08-modules-and-feature-flags.md'],
    notes: [
      'A feature works only when the plan allows it and the switch is on. The plan is the ceiling; this switch is the per-vendor choice.',
      'Locked rows are not in the vendor’s plan. Change the plan first, from the Billing tab or Plans.',
      'Some features depend on others. Abandoned cart reminders need Offer messages, Service requests needs Warranty registration and Trade schemes need Trade accounts, so switching one on asks to switch both.',
      'Switching a feature off hides its CMS screens and makes its store pages and API return “not found”. The data stays, so switching back on restores it. Changes reach the live store right away.',
      'The industry preset only fills defaults when the store is created. Re-applying it is a deliberate action.',
      'Schemes, coupons, wishlist, reviews, offer messages, abandoned cart reminders and affiliates moved into Phase 1 on 3 October 2026. The first six are on for every new store; affiliates follow the industry preset and the plan. Settings opens the feature’s config, including the platform caps (for example offer messages per shopper per week).',
      'WhatsApp offers are switched on or off here by our team, per vendor, when the vendor asks. The vendor has no switch of its own. Switching on also means submitting the vendor’s WhatsApp marketing templates; until they are approved, offers keep going by email.',
    ],
    render: () => vendorShell('sa-vendor-features', 'Features', `
      <div class="callout">${icon('layers', 15)}<span class="sp"><b>Growth plan</b> · industry preset <b>Sanitary</b> applied on 12 Aug 2026 ${pin(5)}</span>${btn('Re-apply preset', { sm: true })}${btn('Compare plans', { sm: true, go: 'sa-plans' })}</div>
      <div class="col" style="gap:6px"><span class="sec-t">Always on</span><div class="row">${['Catalog', 'Cart and checkout', 'Orders and GST invoices', 'CMS pages', 'Customers', 'CSV import'].map((t) => chip(icon('check', 12) + t)).join('')}</div></div>
      ${card('MVP features', table(['Feature', 'Key', `In plan ${pin(1)}`, 'On'], [
        featureRow('Guest checkout', 'guest-checkout', true, true),
        featureRow('Cash on delivery', 'cod', true, true),
        featureRow('Enquiries inbox', 'enquiries', true, true),
        featureRow('Enquire-only products', 'enquire-only-products', true, true, ' ' + pill('preset', 'dash')),
        featureRow('Dealer locator', 'dealer-locator', true, true, ' ' + pill('preset', 'dash')),
        featureRow('Downloads page', 'downloads', true, true, ' ' + pill('preset', 'dash')),
        featureRow('WhatsApp button', 'whatsapp-button', true, true),
        featureRow('Pincode check', 'pincode-check', true, true),
        featureRow('Product videos', 'product-videos', true, true, ' ' + pill('preset', 'dash')),
        featureRow('Size guide', 'size-guide', true, false),
      ]), { flat: true })}
      ${card(`Growth features, Phase 1 ${pin(6)}`, table(['Feature', 'Key', 'In plan', 'On', ''], [
        [...featureRow('Schemes and offers', 'schemes', true, true, '<span class="sub">Festival schemes, launch offers</span>'), btn('Settings', { sm: true })],
        [...featureRow('Coupons', 'coupons', true, true), ''],
        [...featureRow('Wishlist', 'wishlist', true, true), ''],
        [...featureRow('Reviews and ratings', 'reviews', true, true), btn('Settings', { sm: true })],
        [...featureRow('Offer messages', 'offer-messages', true, true, '<span class="sub">Offer emails to opted-in shoppers</span>'), btn('Settings', { sm: true })],
        [...featureRow(`WhatsApp offers ${pin(7)}`, 'whatsapp-offers', true, false, '<span class="sub">Offers and cart reminders on WhatsApp, about ₹1.02 each on the vendor’s Meta bill. Needs Offer messages</span>'), ''],
        [...featureRow('Abandoned cart reminders', 'abandoned-cart', true, true, `<span class="sub">Needs Offer messages ${pin(3)}</span>`), ''],
        [...featureRow('Affiliate program', 'affiliate', true, false, '<span class="sub">Commissions to affiliates</span>'), btn('Settings', { sm: true })],
      ]), { flat: true })}
      ${zone(card('Phase 2 modules', table(['Feature', 'Key', 'In plan', 'On', ''], [
        [...featureRow('Warranty registration', 'warranty', true, false), btn('Settings', { sm: true })],
        [...featureRow('Service requests', 'service-requests', true, false, '<span class="sub">Needs Warranty registration</span>'), ''],
        [...featureRow('Spare parts finder', 'spare-parts', true, false), ''],
        [...featureRow('Product compare', 'compare', true, false), ''],
        [...featureRow('Loyalty points', 'loyalty', true, false), btn('Settings', { sm: true })],
        [...featureRow('Multilingual store', 'multilingual', true, false), btn('Settings', { sm: true })],
        [...featureRow(`Trade accounts ${pin(2)}`, 'b2b', 'Enterprise', false, '<span class="sub">Dealers, retailers, wholesalers, interior designers</span>'), ''],
        [...featureRow('Trade schemes and dealer anniversary', 'trade-schemes', 'Enterprise', false, '<span class="sub">Needs Trade accounts and Schemes</span>'), ''],
      ]), { flat: true }), { p2: true })}
      <p class="small muted">${icon('refresh', 13)} Saved changes reach the live store right away. Switching off keeps the data. ${pin(4)}</p>`),
  });

  WF.screen({
    id: 'sa-vendor-connectors', surface: 'sa', group: 'Vendor detail', title: 'Vendor connectors',
    purpose: 'Decide which payment, shipping and messaging providers a vendor may use, and watch their health. The vendor enters their own keys.',
    route: '/admin/collections/tenants/:id (Connectors tab)', who: 'Super admin', data: ['connector-configs', 'plans'], docs: ['docs/09-connectors.md', 'docs/14-security-and-compliance.md'],
    notes: [
      '“Allowed” is your switch, capped by the plan. The vendor owner then connects the provider with their own keys from their CMS, so money goes straight to the vendor’s account.',
      'Secrets are encrypted at rest and are never shown here, in the CMS, in logs or in the browser.',
      'Health comes from the last webhook and the last error. A failing webhook means payments may not be marked paid, so it also appears on the platform dashboard.',
      'WhatsApp and SMS order updates go out from the vendor’s own accounts (ADR 0005). Your team sets them up during onboarding and sets each store’s daily SMS limit. Planned for the MVP; still waiting on your MVP or Phase 2 call.',
      'Offer messages (Phase 1) reuse the same WhatsApp number with separate marketing templates, approved by Meta per vendor. Your team submits the starter offer templates at onboarding if the vendor wants WhatsApp offers; offer emails need no extra setup.',
    ],
    render: () => vendorShell('sa-vendor-connectors', 'Connectors', `
      <div class="callout alert">${icon('bell', 16)}<div class="sp"><b>Razorpay webhook failing since 10:42 today</b><div class="small muted">14 events failed the signature check. The webhook secret saved in the CMS probably does not match the one in Razorpay. Orders paid since then are being settled by the 15-minute reconciliation job.</div></div>${btn('Email the owner', { sm: true })}${btn('Open vendor CMS', { sm: true, go: 'cms-payments' })}</div>
      <div class="g c2">
        ${card('Payments', `
          <div class="row" style="justify-content:space-between"><b>Razorpay</b>${tog(true, `Allowed ${pin(1)}`)}</div>
          ${dlSmall([['Connected by', 'Priya Shah (owner), 19 Aug'], ['Mode', pill('Live', 's-ok')], ['Key ID', '<span class="mono">rzp_live_••••••a91F</span>'], ['Key secret', `Encrypted, never shown ${pin(2)}`], ['Last webhook OK', 'Today 10:41'], ['Last error', `10:42 signature mismatch ${pin(3)}`]])}
          <div class="hr"></div>
          <div class="row" style="justify-content:space-between"><b>Cash on delivery</b><span class="small muted">Feature switch, see Features</span></div>
          <span class="small muted">Vendor rules: orders ₹499 to ₹25,000, ₹49 fee, only in zones that allow COD.</span>`)}
        <div class="col">
          ${card('Shipping', `
            <div class="row" style="justify-content:space-between"><b>Manual shipping</b>${pill('Always on', 's-ok')}</div>
            <span class="small muted">4 zones set by the vendor; staff type carrier and tracking number.</span>
            <div class="row" style="justify-content:space-between;padding:6px 0"><b>Shiprocket</b>${tog(true, 'Allowed')}</div><span class="small muted">Post-order handling: courier booking, AWB labels, pickups, tracking, plus the pincode check. The vendor connects their own Shiprocket account; the delivery fee still comes from their rate card.</span>`)}
          ${card(`Order updates to shoppers ${pin(4)}`, `
            <div class="row" style="justify-content:space-between"><b>WhatsApp (Meta Cloud API)</b>${tog(true, 'Allowed')}</div>
            <span class="small muted">Vendor’s own number +91 90000 00001, shown as “Aquaverde”. Set up by Ananya on 14 Aug.</span>
            <div class="row">${pill('Quality high', 's-ok')}${pill('2,000 a day', 's-ok')}${pill('14 order templates approved', 's-ok')}${pill('3 offer templates approved', 's-ok')}</div>
            <span class="small muted">Offer messages use marketing templates, about ₹1.02 each incl. GST on the vendor’s Meta bill. Our team switches WhatsApp offers on per vendor in the Features tab. ${pin(5)}</span>
            <div class="hr"></div>
            <div class="row" style="justify-content:space-between"><b>SMS (MSG91 with DLT)</b>${tog(true, 'Allowed')}</div>
            ${field('Daily SMS limit for this store', '2,000', { help: 'Alert at 80%. Today: 312 sent.' })}
            <div class="hr"></div>
            <div class="row" style="justify-content:space-between"><b>Email</b>${pill('Platform Resend', 's-ok')}</div>
            <span class="small muted">Sends as Aquaverde from its verified domain.</span>
            ${zone(`<div class="row" style="justify-content:space-between;padding:6px 0"><b>Self-serve “Connect WhatsApp”</b>${tog(false, 'Allowed')}</div><span class="small muted">Needs the platform to become a Meta Tech Provider.</span>`, { p2: true })}`)}
        </div>
      </div>`),
  });
  function dlSmall(pairs) {
    return `<div class="list small">${pairs.map(([k, v]) => `<div><span class="muted sp">${k}</span><span>${v}</span></div>`).join('')}</div>`;
  }

  WF.screen({
    id: 'sa-vendor-domains', surface: 'sa', group: 'Vendor detail', title: 'Vendor domains',
    purpose: 'The web addresses that open this vendor’s store, and which one is primary.',
    route: '/admin/collections/tenant-domains?tenant=:id', who: 'Super admin', data: ['tenant-domains'], docs: ['docs/04-multi-tenancy.md', 'docs/15-scalability-and-ops.md'],
    notes: [
      'In the MVP every store gets a subdomain of the platform domain, ready the moment the vendor is created.',
      'Custom domains with automatic SSL come in Phase 2. The request’s host name is looked up here (cached) to find the store on every visit.',
      'Only one domain is primary. With redirect on, the others send visitors and search engines to it with a permanent redirect.',
    ],
    render: () => vendorShell('sa-vendor-domains', 'Domains', `
      ${card('Domains', table(['Host', 'Type', 'Primary', 'DNS', 'SSL', ''], [
        ['<span class="mono">aquaverde.tenantecom.in</span>', `Subdomain ${pin(1)}`, pill('Primary', 's-ok'), 'Managed by us', pill('Active', 's-ok'), ''],
        ['<span class="mono">shop.aquaverde.in</span>', 'Custom ' + tag.p2('P2'), btn('Make primary', { sm: true }), pill('CNAME found', 's-ok'), pill('Issuing certificate', 's-warn'), btn('', { icon: 'more', sm: true, label: 'More' })],
        ['<span class="mono">aquaverde.in</span>', 'Custom ' + tag.p2('P2'), no, pill('Not found', 's-bad'), no, btn('Check again', { sm: true })],
      ]), { flat: true })}
      ${zone(card(`Add a custom domain ${pin(2)}`, `
        <div class="row nw">${field('Domain', '', { ph: 'www.aquaverde.in', cls: 'sp' })}${btn('Add domain', { pri: true })}</div>
        <div class="callout small"><div class="col" style="gap:4px"><b>Ask the vendor to add this DNS record</b><span class="mono">CNAME&nbsp;&nbsp;www&nbsp;&nbsp;→&nbsp;&nbsp;cname.tenantecom.in</span><span class="muted">The certificate is issued automatically once the record is found.</span></div></div>`), { p2: true })}
      ${card('Settings', `${tog(true, `Send other domains to the primary domain (permanent redirect) ${pin(3)}`)}`)}`),
  });

  WF.screen({
    id: 'sa-vendor-billing', surface: 'sa', group: 'Vendor detail', title: 'Vendor billing',
    purpose: 'This vendor’s subscription: plan, price, status and payment history, with a way to record payments by hand in the MVP.',
    route: '/admin/collections/subscriptions/:id', who: 'Super admin', data: ['subscriptions', 'plans', 'platform-invoices'], docs: ['docs/06-data-model.md', 'docs/00-overview.md'],
    notes: [
      'Plan price plus 18% GST. Our invoice to the vendor carries their GSTIN so they can claim input tax credit.',
      'MVP billing is manual: your team records bank transfers and UPI payments. When a period ends unpaid the status becomes past due; suspending the store stays your team’s decision.',
      'Recording a payment moves the period forward and adds a line to the history.',
      'Phase 2 switches to Razorpay Subscriptions: automatic charges, status changes from webhooks, and GST invoices to vendors generated as PDFs.',
    ],
    render: () => vendorShell('sa-vendor-billing', 'Billing', `
      <div class="g c21">
        <div class="col">
          ${card('Subscription', `${dl([
            ['Plan', `<b>Growth</b> · ₹9,999 / month`], ['With GST', `₹9,999 + 18% = <b>₹11,798.82</b> ${pin(1)}`],
            ['Status', pill('Active', 's-ok')], ['Billing', `Manual ${pin(2)} ${tag.p2('Razorpay in P2')}`],
            ['Current period', '1 Oct to 31 Oct 2026'], ['Next payment due', 'Sun, 1 Nov 2026'],
          ])}<div class="row">${btn('Record payment', { pri: true })}${btn('Change plan', { go: 'sa-plans' })}${btn('Pause')}${btn('Cancel subscription', { danger: true })}</div>`)}
          ${card('History', table(['Date', 'Event', '>Amount', 'Reference', 'By'], [
            ['1 Oct 2026', 'Payment recorded', '₹11,798.82', '<span class="mono xs">NEFT · UTR ending 4417</span>', 'Ananya'],
            ['2 Sep 2026', 'Payment recorded', '₹11,798.82', '<span class="mono xs">UPI · ref ending 9032</span>', 'Ananya'],
            ['15 Aug 2026', 'Plan changed, Starter to Growth', no, no, 'Rohit'],
            ['12 Aug 2026', 'Trial started, 14 days', no, no, 'Ananya'],
          ]), { flat: true })}
        </div>
        <div class="col">
          ${card(`Record payment ${pin(3)}`, `${field('Amount', '₹11,798.82')}${field('Paid on', '1 Oct 2026', { icon: 'cal' })}${field('Method', 'NEFT / RTGS', { sel: true })}${field('UTR or reference', '', { ph: 'For example SBIN0000000000' })}${field('Covers', 'October 2026', { sel: true })}${btn('Save payment', { pri: true, block: true })}`)}
          ${zone(card(`Invoices to vendor ${pin(4)}`, `<div class="list small"><div>${icon('file', 14)}<span class="mono sp">TE/2026-27/0142</span><span>₹11,798.82</span></div><div>${icon('file', 14)}<span class="mono sp">TE/2026-27/0097</span><span>₹11,798.82</span></div></div>`), { p2: true })}
        </div>
      </div>`),
  });

  WF.screen({
    id: 'sa-vendor-staff', surface: 'sa', group: 'Vendor detail', title: 'Vendor staff',
    purpose: 'The people who can sign in to this vendor’s CMS, their roles and their security status.',
    route: '/admin/collections/users?tenant=:id', who: 'Super admin; vendor owners manage the same list in their CMS', data: ['users'], docs: ['docs/05-auth-and-roles.md'],
    notes: [
      'Your team can add, remove or change any vendor’s staff. Vendor owners do the same for their own store from CMS, Staff and roles.',
      'Roles are per store. One person can work for two stores with different roles, and never sees a store they are not added to.',
      'Reset two-step verification when someone loses their phone. The reset is logged.',
      'The staff count is capped by the plan.',
    ],
    render: () => vendorShell('sa-vendor-staff', 'Staff', `
      <div class="row">${`<div style="width:280px">${meter(`Staff users ${pin(4)}`, 6, 10)}</div>`}<span class="sp"></span>${btn('Invite staff', { pri: true, icon: 'plus' })}</div>
      ${card('', table(['Name', 'Email', `Roles ${pin(2)}`, 'Two-step', 'Last sign-in', ''], [
        ['<b>Priya Shah</b>', 'priya@aquaverde.example', pill('Owner', 's-ok'), pill('On', 's-ok'), 'Today 09:05', btn('', { icon: 'more', sm: true, label: 'More' })],
        ['<b>Arjun Mehta</b>', 'arjun@aquaverde.example', pill('Manager'), pill('On', 's-ok'), 'Yesterday', btn('', { icon: 'more', sm: true, label: 'More' })],
        ['<b>Neha Patel</b>', 'neha@aquaverde.example', pill('Catalog editor'), pill('Off', 's-off'), 'Today 09:12', btn(`Reset two-step`, { sm: true })],
        ['<b>Imran Sheikh</b>', 'imran@aquaverde.example', pill('Order manager'), pill('Off', 's-off'), 'Today 08:40', btn('', { icon: 'more', sm: true, label: 'More' })],
        ['<b>Kavya Rao</b>', 'kavya@aquaverde.example', pill('Content editor'), pill('Off', 's-off'), '28 Sep', btn('', { icon: 'more', sm: true, label: 'More' })],
        ['<b>Support desk</b>', 'support@aquaverde.example', pill('Support'), pill('Off', 's-off'), '30 Sep', btn('', { icon: 'more', sm: true, label: 'More' })],
      ]), { flat: true })}
      <p class="small muted">Platform team can manage every vendor’s staff ${pin(1)} · Two-step resets are logged ${pin(3)}</p>`),
  });

  /* ---------------- Billing ---------------- */
  const planCard = (name, code, price, yearly, limits, vendors, p) => card(`${name}${p ? pin(p) : ''}`, `
      <span class="mono xs faint">${code}</span>
      <div><b style="font-size:20px">${price}</b><span class="small muted"> / month</span><div class="xs muted">${yearly} / year · plus GST</div></div>
      <div class="list small">${limits.map(([k, v]) => `<div><span class="muted sp">${k}</span><b>${v}</b></div>`).join('')}</div>
      <div class="row small"><span class="sp">${vendors}</span>${btn('Edit plan', { sm: true })}</div>`);
  WF.screen({
    id: 'sa-plans', surface: 'sa', group: 'Billing', title: 'Plans',
    purpose: 'Subscription tiers: price, limits, and which features and connectors each tier allows.',
    route: '/admin/collections/plans', who: 'Super admin', data: ['plans'], docs: ['docs/08-modules-and-feature-flags.md', 'docs/06-data-model.md'],
    notes: [
      'Plan names, prices and limits here are placeholders until you set them.',
      'A plan is a ceiling, not a switch. Vendors on Growth can have Warranty, but it is off until someone switches it on in their Features tab.',
      'Removing a feature from a plan first lists the vendors using it. Their data is kept and the feature is switched off for them.',
      'Limits are checked on the server. Suggested behaviour: warn at 90%, block new products at 100% with a clear message.',
    ],
    render: () => shell('sa-plans', {
      crumbs: [['Billing'], ['Plans']], title: 'Plans', sub: `3 active plans ${pin(1)}`,
      actions: btn('New plan', { pri: true, icon: 'plus' }),
      body: `
        <div class="g c3">
          ${planCard('Starter', 'starter', '₹4,999', '₹49,990', [['Products', '500'], ['Staff users', '3'], ['Storage', '5 GB'], ['Orders / month', '1,000']], '16 vendors (2 on trial)')}
          ${planCard('Growth', 'growth', '₹9,999', '₹99,990', [['Products', '2,000'], ['Staff users', '10'], ['Storage', '20 GB'], ['Orders / month', '5,000']], '22 vendors (2 on trial)', 4)}
          ${planCard('Enterprise', 'enterprise', '₹24,999', '₹2,49,990', [['Products', '10,000'], ['Staff users', '30'], ['Storage', '100 GB'], ['Orders / month', 'No limit']], '4 vendors')}
        </div>
        ${card(`Features allowed ${pin(2)}`, table(['Feature', 'Phase', '>Starter', '>Growth', '>Enterprise'], [
          ['Guest checkout, COD, pincode check', 'MVP', yes, yes, yes],
          ['Enquiries, enquire-only products', 'MVP', yes, yes, yes],
          ['Dealer locator, downloads, product videos', 'MVP', yes, yes, yes],
          ['WhatsApp button, size guide', 'MVP', yes, yes, yes],
          ['Schemes and offers, coupons', 'MVP', yes, yes, yes],
          ['Wishlist, reviews', 'MVP', yes, yes, yes],
          ['Offer messages, abandoned cart reminders', 'MVP', yes, yes, yes],
          ['Affiliate program and commissions', 'MVP', no, yes, yes],
          ['Warranty and service requests', tag.p2('P2'), no, yes, yes],
          ['Spare parts finder, product compare', tag.p2('P2'), no, yes, yes],
          ['Loyalty points', tag.p2('P2'), no, yes, yes],
          ['Multilingual store', tag.p2('P2'), no, yes, yes],
          ['Trade accounts: dealers, retailers, wholesalers, interior designers', tag.p2('P2'), no, no, yes],
          ['Trade schemes, dealer anniversary offers', tag.p2('P2'), no, no, yes],
        ]), { flat: true, act: `<span class="small muted">Removing a feature lists affected vendors first ${pin(3)}</span>` })}
        ${card('Connectors allowed', table(['Connector', 'Phase', '>Starter', '>Growth', '>Enterprise'], [
          ['Razorpay', 'MVP', yes, yes, yes], ['Manual shipping', 'MVP', yes, yes, yes],
          ['WhatsApp order updates', 'MVP', yes, yes, yes], ['SMS order updates', 'MVP', yes, yes, yes], ['Shiprocket', 'MVP', yes, yes, yes],
        ]), { flat: true })}`,
    }),
  });

  WF.screen({
    id: 'sa-subscriptions', surface: 'sa', group: 'Billing', title: 'Subscriptions',
    purpose: 'Who pays what, who is on trial and who owes money, across all vendors.',
    route: '/admin/collections/subscriptions', who: 'Super admin; support read-only', data: ['subscriptions', 'plans', 'tenants'], docs: ['docs/06-data-model.md', 'docs/17-roadmap.md'],
    notes: [
      'In the MVP this is your team’s billing desk: payments arrive by bank transfer or UPI and are recorded by hand.',
      'Past due starts the day after a period ends unpaid. Suggested: the vendor sees a banner in their CMS; suspending the store stays a manual decision.',
      'From Phase 2, Razorpay Subscriptions charges vendors automatically and webhooks move these statuses without anyone typing.',
    ],
    render: () => shell('sa-subscriptions', {
      crumbs: [['Billing'], ['Subscriptions']], title: 'Subscriptions', sub: `Manual billing ${pin(1)} ${tag.p2('Automatic in P2')}`,
      actions: btn('Export CSV', { icon: 'down' }),
      body: `
        <div class="g c4">${kpi('MRR', '₹3.70 L', '38 paying vendors, before GST')}${kpi('On trial', '4', '2 end this week')}${kpi('Past due', '2', '₹17,697.64 incl. GST', { pin: 2 })}${kpi('Renewing in 7 days', '11', '₹1,42,786 incl. GST')}</div>
        ${tabs([['All', null, 44], ['Trialing', null, 4], ['Active', null, 36], ['Past due', null, 2], ['Paused', null, 1], ['Cancelled', null, 1]], 'All')}
        ${table(['Vendor', 'Plan', 'Status', 'Billing', 'Period ends', '>Amount incl. GST', 'Last payment', ''], [
          { c: ['<b>Loomhouse Apparel</b>', 'Growth', pill('Past due', 's-bad'), 'Manual', '22 Sep 2026', '₹11,798.82', '24 Aug', btn('Record payment', { sm: true })], go: null },
          { c: ['<b>Saffron Weaves</b>', 'Starter', pill('Past due', 's-bad'), 'Manual', '30 Sep 2026', '₹5,898.82', '1 Sep', btn('Record payment', { sm: true })], go: null },
          { c: ['<b>Brasskraft Fittings</b>', 'Starter', pill('Trialing', 's-warn'), 'Manual', 'Trial ends 14 Oct', '₹5,898.82', no, ''], go: null },
          { c: ['<b>Aquaverde Sanitary</b>', 'Growth', pill('Active', 's-ok'), 'Manual', '31 Oct 2026', '₹11,798.82', '1 Oct', ''], go: 'sa-vendor-billing' },
          { c: ['<b>Hingewell Hardware</b>', 'Enterprise', pill('Active', 's-ok'), 'Manual', '31 Oct 2026', '₹29,498.82', '1 Oct', ''], go: null },
          { c: ['<b>Kalakriti Home</b>', 'Growth', pill('Paused', 's-off'), no, no, no, '12 Mar', ''], go: null },
        ])}
        ${zone(`<div class="callout small">${icon('refresh', 14)}<span>Razorpay Subscriptions: vendors pay by card or UPI autopay; failed charges retry and move the status to past due automatically. ${pin(3)}</span></div>`, { p2: true })}`,
    }),
  });

  /* ---------------- Platform ---------------- */
  WF.screen({
    id: 'sa-team', surface: 'sa', group: 'Platform', title: 'Team and access',
    purpose: 'Your own team’s accounts: who can change things across all vendors and who can only look.',
    route: '/admin/collections/users?platformRole=*', who: 'Super admin', data: ['users'], docs: ['docs/05-auth-and-roles.md', 'docs/14-security-and-compliance.md'],
    notes: [
      'Two platform roles, our team only. Super admin has complete control of every store (Manage store opens its CMS with full edit, audited); Support can open any store read-only to help.',
      'Two-step verification is required for every platform account and cannot be switched off.',
      'Every time someone from our team manages or views a vendor’s CMS it is logged with the reason, and every change made while managing is logged too. A screen to browse the audit log comes later.',
    ],
    render: () => shell('sa-team', {
      crumbs: [['Platform'], ['Team and access']], title: 'Team and access', sub: '4 people',
      actions: btn('Invite teammate', { pri: true, icon: 'plus' }),
      body: `<div class="g c31">
        ${card('', table(['Name', 'Email', `Role ${pin(1)}`, 'Two-step', 'Last sign-in', ''], [
          ['<b>Rohit Verma</b>', 'rohit@tenantecom.in', pill('Super admin', 's-ok'), pill('On', 's-ok'), 'Today 08:58', btn('', { icon: 'more', sm: true, label: 'More' })],
          ['<b>Ananya Iyer</b>', 'ananya@tenantecom.in', pill('Super admin', 's-ok'), pill('On', 's-ok'), 'Yesterday', btn('', { icon: 'more', sm: true, label: 'More' })],
          ['<b>Sahil Khan</b>', 'sahil@tenantecom.in', pill('Support'), pill('On', 's-ok'), 'Today 09:20', btn('', { icon: 'more', sm: true, label: 'More' })],
          ['<b>Meera Joshi</b>', 'meera@tenantecom.in', pill('Support'), pill('On', 's-ok'), '29 Sep', btn('', { icon: 'more', sm: true, label: 'More' })],
        ]), { flat: true })}
        <div class="col">
          ${card('Invite a teammate', `${field('Email', '', { ph: 'name@tenantecom.in' })}<div class="fld"><span class="fl">Role</span><div class="col" style="gap:6px">${radio(false, 'Super admin: full control of every store')}${radio(true, 'Support: read-only across vendors')}</div></div>${btn('Send invite', { pri: true, block: true })}`)}
          ${card('Security', `<div class="list small"><div><span class="sp">Two-step verification ${pin(2)}</span>${tog(true, '', { lock: true })}<span class="xs muted">Required</span></div><div><span class="sp">Session length</span><b>8 hours</b></div><div><span class="sp">Lock after failed sign-ins</span><b>5 tries, 15 min</b></div><div><span class="sp">Support access log ${pin(3)}</span>${tag.later('Viewer later')}</div></div>`)}
        </div>
      </div>`,
    }),
  });
})();
