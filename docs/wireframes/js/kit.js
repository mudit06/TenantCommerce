/* TenantEcom wireframes: shared drawing kit.
   Screens register with WF.screen({ id, surface, group, title, purpose, route, who, data, notes, render }).
   render() returns an HTML string. Elements with data-go="<screen id>" are clickable links between screens. */
(function () {
  'use strict';
  const WF = (window.WF = { screens: [], byId: {}, surfaces: {}, navs: {} });

  WF.surface = (id, def) => { WF.surfaces[id] = def; };
  WF.screen = (s) => { WF.screens.push(s); WF.byId[s.id] = s; };

  const go = (id) => (id ? ` data-go="${id}"` : '');
  WF.go = go;

  /* 16px stroke icons */
  const I = {
    search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>',
    cart: '<path d="M1.5 2h2l1.6 8h7.4l1.5-5.5H4.3"/><circle cx="6.5" cy="13" r="1"/><circle cx="11.5" cy="13" r="1"/>',
    user: '<circle cx="8" cy="5.5" r="2.8"/><path d="M2.5 14c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2"/>',
    users: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.5 13.5c.6-2.4 2.3-3.7 4.5-3.7s3.9 1.3 4.5 3.7"/><path d="M10.5 3.2a2.5 2.5 0 0 1 0 4.6M12 10c1.3.5 2.1 1.7 2.5 3.5"/>',
    menu: '<path d="M2 4h12M2 8h12M2 12h12"/>',
    home: '<path d="M2 7.5 8 2.5l6 5V14H2z"/><path d="M6.5 14v-4h3v4"/>',
    grid: '<rect x="2" y="2" width="5" height="5" rx=".5"/><rect x="9" y="2" width="5" height="5" rx=".5"/><rect x="2" y="9" width="5" height="5" rx=".5"/><rect x="9" y="9" width="5" height="5" rx=".5"/>',
    heart: '<path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z"/>',
    pin: '<path d="M8 14.5s-4.5-4.6-4.5-8a4.5 4.5 0 0 1 9 0c0 3.4-4.5 8-4.5 8z"/><circle cx="8" cy="6.5" r="1.6"/>',
    phone: '<path d="M3 2h3l1.2 3-1.7 1.2a8 8 0 0 0 4.3 4.3L11 8.8l3 1.2v3a1.5 1.5 0 0 1-1.6 1.5C7 14.2 1.8 9 1.5 3.6A1.5 1.5 0 0 1 3 2z"/>',
    chat: '<path d="M2.5 13.5l1-3A5.5 5.5 0 1 1 6 12.8z"/>',
    down: '<path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5M2.5 13.5h11"/>',
    up: '<path d="M8 11V3M4.5 6.2 8 2.7l3.5 3.5M2.5 13.5h11"/>',
    filter: '<path d="M2 3.5h12M4.5 8h7M6.5 12.5h3"/>',
    sort: '<path d="M4.5 2.5v11M2 11l2.5 2.5L7 11M11.5 13.5v-11M9 5l2.5-2.5L14 5"/>',
    chev: '<path d="M6 3.5 10.5 8 6 12.5"/>',
    chevd: '<path d="M3.5 6 8 10.5 12.5 6"/>',
    back: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
    x: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    minus: '<path d="M3 8h10"/>',
    check: '<path d="M3 8.5 6.5 12 13 4.5"/>',
    lock: '<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
    bell: '<path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11z"/><path d="M6.5 14h3"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
    box: '<path d="M2 5l6-3 6 3v6l-6 3-6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>',
    truck: '<path d="M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5v2h-5"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="11.5" cy="12" r="1.3"/>',
    file: '<path d="M4 1.5h5l3 3v10H4z"/><path d="M9 1.5v3h3"/>',
    play: '<path d="M5 3l8 5-8 5z"/>',
    star: '<path d="M8 2l1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z"/>',
    wifioff: '<path d="M2 2l12 12M5 8.2a5 5 0 0 1 2-1M1.8 5.6A9 9 0 0 1 5 3.8M10.8 7.6A5 5 0 0 1 11 8.2M8 12.5h.01M9.6 3.2a9 9 0 0 1 4.6 2.4"/>',
    ext: '<path d="M9 2.5h4.5V7M13.5 2.5 7 9M12 9.5v4H2.5V4h4"/>',
    eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
    cal: '<rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3"/>',
    shield: '<path d="M8 1.5 13.5 3.5v4c0 3.5-2.5 6-5.5 7-3-1-5.5-3.5-5.5-7v-4z"/>',
    tag: '<path d="M2 2h6l6 6-6 6-6-6z"/><circle cx="5" cy="5" r="1"/>',
    chart: '<path d="M2 14V2M2 14h12M5 11V8M8 11V5M11 11V7"/>',
    store: '<path d="M2 6l1-3.5h10L14 6M2 6h12M2 6c0 1.4 1.3 2 2 2s2-.6 2-2c0 1.4 1.3 2 2 2s2-.6 2-2c0 1.4 1.3 2 2 2s2-.6 2-2M3 8v6h10V8"/>',
    layers: '<path d="M8 2 14 5 8 8 2 5z"/><path d="M2 8l6 3 6-3M2 11l6 3 6-3"/>',
    globe: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/>',
    plug: '<path d="M5.5 1.5v3M10.5 1.5v3M3.5 4.5h9v3a4.5 4.5 0 0 1-9 0zM8 12v2.5"/>',
    card: '<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M1.5 6.5h13M4 10h3"/>',
    inbox: '<path d="M2 9l1.5-6h9L14 9v4H2z"/><path d="M2 9h3.5l1 1.5h3l1-1.5H14"/>',
    image: '<rect x="2" y="2.5" width="12" height="11" rx="1"/><circle cx="6" cy="6" r="1.2"/><path d="M2 12l4-4 3 3 2-2 3 3"/>',
    link: '<path d="M7 9a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8M9 7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8"/>',
    receipt: '<path d="M3 1.5h10v13l-2-1.2-1.5 1.2L8 13.3l-1.5 1.2L5 13.3l-2 1.2z"/><path d="M5.5 5h5M5.5 8h5"/>',
    wrench: '<path d="M10.5 2a3.5 3.5 0 0 0-3.2 4.8L2 12.1 3.9 14l5.3-5.3A3.5 3.5 0 0 0 14 5.5l-2 .5-1.5-1.5.5-2z"/>',
    drag: '<path d="M6 3.5h.01M10 3.5h.01M6 8h.01M10 8h.01M6 12.5h.01M10 12.5h.01" stroke-width="2.2"/>',
    more: '<path d="M3.5 8h.01M8 8h.01M12.5 8h.01" stroke-width="2.4"/>',
    copy: '<rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V2.5H2.5V11H5"/>',
    loc: '<circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5"/>',
    zoom: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14M5 7h4M7 5v4"/>',
    upload: '<path d="M8 10V2.5M4.5 5.8 8 2.3l3.5 3.5M2.5 10.5v3h11v-3"/>',
    whatsapp: '<path d="M2.5 13.5l.9-2.7a5.6 5.6 0 1 1 2.1 2z"/><path d="M6 6.2c.2 1.5 1.6 2.9 3.4 3.4l.8-.8 1.1.6-.3 1c-2.4.2-5.4-2.6-5.2-5l1-.3.6 1.1z"/>',
    refresh: '<path d="M13 3v3.5H9.5"/><path d="M12.6 6.5A5 5 0 1 0 13 10"/>',
    mail: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M1.5 4l6.5 5 6.5-5"/>',
  };
  WF.icon = (n, s = 16) =>
    `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
  const icon = WF.icon;

  WF.pin = (n) => `<i class="pin" aria-label="Note ${n}">${n}</i>`;

  WF.btn = (label, o = {}) => {
    const cls = ['b', o.pri && 'pri', o.ghost && 'ghost', o.sm && 'sm', o.lg && 'lg', o.block && 'block', o.danger && 'danger', !label && 'ico', o.cls]
      .filter(Boolean).join(' ');
    const aria = !label && o.label ? ` aria-label="${o.label}"` : '';
    return `<button type="button" class="${cls}"${aria}${go(o.go)}>${o.icon ? icon(o.icon, 14) : ''}${label ? `<span>${label}</span>` : ''}${o.after ? icon(o.after, 14) : ''}</button>`;
  };
  WF.ibtn = (name, label, o = {}) =>
    `<button type="button" class="ib" aria-label="${label}"${go(o.go)}>${icon(name, 18)}${o.badge ? `<span class="bd">${o.badge}</span>` : ''}</button>`;

  WF.ph = (label = 'Image', o = {}) => {
    const st = (o.h ? `height:${o.h}px;` : '') + (o.w ? `width:${o.w}px;` : '') + (o.ar ? `aspect-ratio:${o.ar};` : '');
    return `<div class="ph${o.cls ? ' ' + o.cls : ''}"${st ? ` style="${st}"` : ''}${go(o.go)}>${label ? `<span>${label}</span>` : ''}${o.inner || ''}</div>`;
  };
  WF.lines = (n = 3, last = 60) =>
    `<div class="lns">${Array.from({ length: n }, (_, i) => `<i style="width:${i === n - 1 ? last : 100 - (i % 2) * 6}%"></i>`).join('')}</div>`;

  WF.field = (label, value = '', o = {}) => {
    const cls = ['in', o.ta && 'ta', o.sel && 'sel', !value && 'empty', o.lg && 'lg', o.focus && 'focus'].filter(Boolean).join(' ');
    return `<div class="fld${o.cls ? ' ' + o.cls : ''}">${label ? `<span class="fl">${label}${o.req ? ' <b class="req">*</b>' : ''}${o.pin ? WF.pin(o.pin) : ''}${o.tag || ''}</span>` : ''}<span class="${cls}"${go(o.go)}>${o.icon ? icon(o.icon, 14) : ''}<span>${value || o.ph || ''}</span>${o.suffix ? `<em>${o.suffix}</em>` : ''}${o.sel ? icon('chevd', 14) : ''}</span>${o.help ? `<span class="help">${o.help}</span>` : ''}</div>`;
  };
  WF.tog = (on, label = '', o = {}) =>
    `<span class="tgl"><span class="tg${on ? ' on' : ''}${o.lock ? ' lock' : ''}"><i></i></span>${o.lock ? icon('lock', 13) : ''}${label ? `<span>${label}</span>` : ''}</span>`;
  WF.chk = (on, label = '') => `<span class="ck${on ? ' on' : ''}"><i>${on ? icon('check', 11) : ''}</i>${label}</span>`;
  WF.radio = (on, label = '') => `<span class="rd${on ? ' on' : ''}"><i></i>${label}</span>`;
  WF.pill = (t, k = '') => `<span class="pl ${k}">${t}</span>`;
  WF.chip = (t, o = {}) => `<span class="chip${o.on ? ' on' : ''}"${go(o.go)}>${t}${o.x ? icon('x', 11) : ''}</span>`;
  WF.sw = (k, label) => `<span class="swt sw-${k}" title="${label || k}"></span>`;

  WF.tag = {
    p2: (t = 'Phase 2') => `<em class="tag t-p2">${t}</em>`,
    flag: (k) => `<em class="tag t-flag">flag: ${k}</em>`,
    later: (t = 'Later') => `<em class="tag t-later">${t}</em>`,
  };
  /* A zone wraps part of the drawing. p2 draws the dashed Phase 2 outline; flag adds a feature-flag tag. */
  WF.zone = (inner, o = {}) => {
    const tags = [o.p2 ? WF.tag.p2(o.p2 === true ? 'Phase 2' : o.p2) : '', ...(o.flag ? [].concat(o.flag).map(WF.tag.flag) : []), o.later ? WF.tag.later() : ''].join('');
    return `<div class="zn${o.p2 ? ' p2' : ''}${o.cls ? ' ' + o.cls : ''}"${o.style ? ` style="${o.style}"` : ''}><span class="tags">${tags}</span>${inner}</div>`;
  };

  WF.tabs = (items, active) =>
    `<div class="tabs" role="presentation">${items
      .map((t) => {
        const [label, id, n] = Array.isArray(t) ? t : [t];
        return `<button type="button" class="tab${label === active ? ' on' : ''}"${go(id)}>${label}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
      })
      .join('')}</div>`;

  /* cols: strings; prefix '>' right-aligns the column. rows: arrays or { c: [...], go: 'screen' } */
  WF.table = (cols, rows, o = {}) => {
    const right = cols.map((c) => String(c).startsWith('>'));
    const head = cols.map((c, i) => `<th${right[i] ? ' class="r"' : ''}>${String(c).replace(/^>/, '')}</th>`).join('');
    const body = rows
      .map((r) => {
        const cells = Array.isArray(r) ? r : r.c;
        const g = Array.isArray(r) ? o.go : r.go !== undefined ? r.go : o.go;
        return `<tr${go(g)}>${o.check ? `<td class="c0">${WF.chk(false)}</td>` : ''}${cells.map((c, i) => `<td${right[i] ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`;
      })
      .join('');
    return `<div class="tblw"><table class="tbl"><thead><tr>${o.check ? `<th class="c0">${WF.chk(false)}</th>` : ''}${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  };

  WF.card = (title, body, o = {}) =>
    `<section class="card${o.flat ? ' flat' : ''}${o.cls ? ' ' + o.cls : ''}"${go(o.go)}>${title ? `<header class="ch"><h4>${title}${o.pin ? WF.pin(o.pin) : ''}${o.tag || ''}</h4>${o.act || ''}</header>` : ''}<div class="cb">${body}</div></section>`;

  WF.kpi = (label, value, sub = '', o = {}) =>
    `<div class="kpi"${go(o.go)}><span class="kl">${label}${o.pin ? WF.pin(o.pin) : ''}</span><b>${value}</b>${sub ? `<span class="ks">${sub}</span>` : ''}</div>`;

  WF.meter = (label, used, max, o = {}) => {
    const pct = Math.min(100, Math.round((used / max) * 100));
    const fmt = o.fmt || ((v) => v.toLocaleString('en-IN'));
    return `<div class="meter${pct >= 90 ? ' hot' : ''}"><div class="mt"><span>${label}${o.pin ? WF.pin(o.pin) : ''}</span><span class="mono">${fmt(used)} / ${fmt(max)}${o.unit ? ' ' + o.unit : ''}</span></div><div class="mb"><i style="width:${pct}%"></i></div></div>`;
  };

  /* Bar chart drawn to scale: bar height = value / axis max. */
  WF.bars = (values, o = {}) => {
    const max = o.max || Math.max(...values);
    const h = o.h || 120;
    const bars = values.map((v, i) => `<i class="${i === values.length - 1 || (o.hl && o.hl.includes(i)) ? 'hl' : ''}" style="height:${((v / max) * 100).toFixed(1)}%" title="${v}"></i>`).join('');
    const ya = o.yLabels || [max, max / 2, 0];
    return `<div class="chart"><div class="ya" style="height:${h + 4}px">${ya.map((l) => `<span>${l}</span>`).join('')}</div><div class="bars" style="height:${h}px">${bars}</div><div class="xa">${(o.xLabels || []).map((l) => `<span>${l}</span>`).join('')}</div></div>`;
  };

  WF.steps = (items, now) =>
    `<div class="steps">${items
      .map((t, i) => `${i ? '<span class="step-sep"></span>' : ''}<span class="step ${i < now ? 'done' : i === now ? 'now' : ''}"><i>${i < now ? icon('check', 11) : i + 1}</i>${t}</span>`)
      .join('')}</div>`;

  /* ---------- Admin chrome (Payload admin) ---------- */
  WF.admin = (cfg) => {
    const nav = WF.navs[cfg.surface];
    const active = cfg.nav || cfg.id;
    const navHtml = nav.groups
      .map((g) => {
        const links = g.items
          .map(([label, id, ic, extra]) => `<a class="${id === active ? 'on' : ''}${extra && extra.off ? ' off' : ''}"${go(id)}>${icon(ic, 15)}<span>${label}</span>${extra && extra.tag ? `<span class="sp"></span>${extra.tag}` : ''}</a>`)
          .join('');
        const inner = `${g.h ? `<h6>${g.h}</h6>` : ''}${links}`;
        return g.zone ? WF.zone(`<div style="padding:12px 0 4px">${inner}</div>`, g.zone) : inner;
      })
      .join('');
    const crumbs = (cfg.crumbs || []).map(([t, id], i, a) => (i === a.length - 1 ? `<b>${t}</b>` : `<span${go(id)}>${t}</span>${icon('chev', 12)}`)).join('');
    return `<div class="adm">
      <nav class="an" aria-label="Admin menu"><div class="logo">${nav.logo}</div>${navHtml}${nav.foot || ''}</nav>
      <div class="am">
        <div class="at"><div class="crumbs">${crumbs}</div><div class="srch">${icon('search', 14)}<span>${nav.search}</span><span class="sp"></span><span class="kbd">Ctrl K</span></div>${nav.top || ''}</div>
        ${cfg.banner || ''}
        <div class="ab">
          ${cfg.title ? `<div class="ah"><div><h2>${cfg.title}</h2>${cfg.sub ? `<p class="sub">${cfg.sub}</p>` : ''}</div><div class="row">${cfg.actions || ''}</div></div>` : ''}
          ${cfg.body}
        </div>
      </div>
    </div>`;
  };

  /* ---------- Storefront chrome (shared default kit, sample vendor Aquaverde) ---------- */
  WF.store = (cfg = {}) => {
    const ann = cfg.checkout ? '' : `<div class="sf-ann"><span${go('st-offers')}>Rainline shower launch: ₹2,290 until 31 Oct</span> · Free delivery above ₹999 · Cash on delivery available</div>`;
    const hdD = cfg.checkout
      ? `<header class="sf-hd d-only"><span class="sf-logo"${go('st-home')}>AQUAVERDE</span><span class="sp"></span><span class="row muted small">${icon('lock', 14)} Secure checkout</span></header>`
      : `<header class="sf-hd d-only">
          <span class="sf-logo"${go('st-home')}>AQUAVERDE</span>
          <nav class="sf-nav"><span${go('st-category')}>Faucets ${icon('chevd', 12)}</span><span>Showers ${icon('chevd', 12)}</span><span>Sanitaryware ${icon('chevd', 12)}</span><span>Accessories</span><span${go('st-dealers')}>Find a dealer</span></nav>
          <div class="sf-search"${go('st-search')}>${icon('search', 15)}<span>Search products or model no.</span></div>
          <div class="sf-icons">${WF.ibtn('user', 'Account', { go: 'st-account' })}${WF.ibtn('heart', 'Wishlist', { badge: 3, go: 'st-wishlist' })}${WF.ibtn('cart', 'Cart', { badge: 2, go: 'st-cart' })}</div>
        </header>`;
    const hdM = cfg.checkout
      ? `<header class="sf-hd m-only">${WF.ibtn('back', 'Back to cart', { go: 'st-cart' })}<span class="sf-logo"${go('st-home')}>AQUAVERDE</span><span class="sp"></span><span class="row muted xs">${icon('lock', 13)} Secure</span></header>`
      : `<header class="sf-hd m-only">${WF.ibtn('menu', 'Menu')}<span class="sf-logo"${go('st-home')}>AQUAVERDE</span><span class="sp"></span>${WF.ibtn('search', 'Search', { go: 'st-search' })}${WF.ibtn('cart', 'Cart', { badge: 2, go: 'st-cart' })}</header>`;
    const ft = cfg.checkout || cfg.noFooter
      ? `<footer class="sf-ft" style="grid-template-columns:1fr"><div class="sf-legal" style="border:0;padding:0"><span>Aquaverde Ceramics Pvt Ltd · GSTIN 24AAQCA4821K1Z9</span><span>Terms · Privacy · Returns</span></div></footer>`
      : `<footer class="sf-ft">
          <div class="s2m"><span class="sf-logo">AQUAVERDE</span><p class="muted" style="margin-top:10px">Faucets, showers and sanitaryware made in Morbi, Gujarat.</p>
            <div class="row" style="margin-top:10px">${icon('phone', 14)}<span>1800 000 0000</span>${icon('whatsapp', 14)}<span>WhatsApp us</span></div>
            ${WF.zone(`<div class="row" style="margin-top:12px">${WF.field('', '', { ph: 'Email or WhatsApp number', cls: 'sp' })}${WF.btn('Get offers', { sm: true, go: 'st-offers' })}</div><span class="xs muted" style="display:block;margin-top:4px">Offers only. Unsubscribe in one tap.</span>`, { flag: 'offer-messages' })}</div>
          <div><h5>Shop</h5><ul><li${go('st-category')}>Faucets</li><li>Showers</li><li>Sanitaryware</li><li>Accessories</li><li${go('st-offers')}>Offers</li></ul></div>
          <div><h5>Help</h5><ul><li${go('st-order')}>Track order</li><li>Shipping</li><li>Returns</li><li${go('st-warranty')}>Warranty</li><li${go('st-contact')}>Contact us</li></ul></div>
          <div><h5>Company</h5><ul><li>About us</li><li${go('st-dealers')}>Find a dealer</li><li${go('st-downloads')}>Downloads</li><li${go('st-contact')}>Become a dealer</li><li${go('st-affiliate')}>Affiliate program</li></ul></div>
          <div class="sf-legal"><span>© 2026 Aquaverde Ceramics Pvt Ltd · GSTIN 24AAQCA4821K1Z9 · Morbi, Gujarat</span><span class="row">${['UPI', 'Visa', 'RuPay', 'Netbanking', 'COD'].map((p) => `<span class="pl">${p}</span>`).join('')}</span></div>
        </footer>`;
    const bn = cfg.checkout || cfg.noBottomNav
      ? ''
      : `<nav class="sf-bn m-only" aria-label="Bottom navigation">${[
          ['Home', 'home', 'st-home'], ['Shop', 'grid', 'st-category'], ['Dealers', 'pin', 'st-dealers'], ['Account', 'user', 'st-account'], ['Cart', 'cart', 'st-cart'],
        ].map(([t, ic, id]) => `<span class="${cfg.tab === t ? 'on' : ''}"${go(id)}>${icon(ic, 18)}${t}</span>`).join('')}</nav>`;
    const wa = cfg.checkout || cfg.noWa ? '' : `<div class="fabw">${WF.zone(`<span class="fab">${icon('whatsapp', 16)}Chat</span>`, { flag: 'whatsapp-button', style: 'transform:translateY(-100%)' })}</div>`;
    return `<div class="sf">${ann}${hdD}${hdM}<main class="sf-main">${cfg.body}</main>${cfg.after || ''}${wa}${ft}${cfg.sticky || ''}${bn}</div>`;
  };

  /* Product card for listings and carousels */
  /* p.offer = { price, off, badge, ends } draws a scheme price (server-computed) over the MRP; p.rating = [average, count] */
  WF.stars = (avg, count) => `<span class="row nw xs" style="gap:3px">${icon('star', 12)}<b>${avg}</b>${count != null ? `<span class="muted">(${count})</span>` : ''}</span>`;
  WF.pcard = (p, o = {}) => {
    const price = p.enquire
      ? `<div class="pr"><b>Price on request</b></div>`
      : p.offer
        ? `<div class="pr"><b>₹${p.offer.price}</b><s>₹${p.mrp}</s><em>${p.offer.off}% off</em></div><span class="xs">${p.offer.badge}${p.offer.ends ? ` · until ${p.offer.ends}` : ''}</span>`
        : `<div class="pr"><b>₹${p.price}</b><s>₹${p.mrp}</s><em>${p.off}% off</em></div>`;
    const sws = p.sw ? `<div class="sw">${p.sw.map((k) => WF.sw(k)).join('')}<span class="xs muted">${p.sw.length > 1 ? p.sw.length + ' finishes' : ''}</span></div>` : '';
    const badge = p.offer ? `<span class="badge">${p.offer.badge}</span>` : p.badge ? `<span class="badge">${p.badge}</span>` : '';
    const heart = o.noHeart ? '' : `<span style="position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;background:var(--paper);border:1px solid var(--wire);display:flex;align-items:center;justify-content:center" aria-label="Save to wishlist">${icon('heart', 14)}</span>`;
    const rating = p.rating ? WF.stars(p.rating[0], p.rating[1]) : '';
    return `<article class="pc"${go(o.go === undefined ? 'st-product' : o.go)}>${WF.ph(p.img || 'Product photo', { ar: '1/1', inner: badge + heart })}<span class="mn">${p.model}</span><span class="t">${p.title}</span>${rating}${price}${sws}${o.cta ? (p.enquire ? WF.btn('Request quote', { sm: true, go: 'st-contact' }) : WF.btn('Add to cart', { sm: true })) : ''}</article>`;
  };

  /* Sample catalogue used by storefront and CMS drawings (prices in rupees for display; stored as paise) */
  WF.products = [
    { title: 'Aria single-lever basin mixer', model: 'AV-BM-1120', price: '4,250', mrp: '5,600', off: 24, sw: ['chrome', 'black', 'gold'], badge: 'Bestseller', rating: [4.6, 38] },
    { title: 'Nimbus wall-hung WC with soft-close seat', model: 'AV-WH-2041', price: '18,450', mrp: '24,990', off: 26, sw: ['white'], rating: [4.4, 12] },
    { title: 'Rainline 200 mm overhead shower', model: 'AV-OS-3200', price: '2,690', mrp: '3,500', off: 23, sw: ['chrome', 'black'], rating: [4.5, 21], offer: { price: '2,290', off: 35, badge: 'Launch price', ends: '31 Oct' } },
    { title: 'Sola thermostatic diverter', model: 'AV-TD-4410', enquire: true, sw: ['chrome'], badge: 'Projects' },
    { title: 'Edge countertop basin 600', model: 'AV-CB-5600', price: '7,990', mrp: '9,990', off: 20, sw: ['white'] },
    { title: 'Quadra towel rail 600', model: 'AV-TR-6060', price: '1,890', mrp: '2,490', off: 24, sw: ['chrome', 'black'] },
    { title: 'Aria tall basin mixer', model: 'AV-BM-1125', price: '6,150', mrp: '7,900', off: 22, sw: ['chrome', 'black', 'gold'] },
    { title: 'Aria wall-mounted mixer', model: 'AV-WM-1130', price: '5,450', mrp: '6,990', off: 22, sw: ['chrome', 'black'] },
  ];
})();
