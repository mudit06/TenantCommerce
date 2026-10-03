/* TenantEcom wireframes: router, index, notes panel and fit-to-width zoom. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const WF = window.WF;
  const SIZES = { sa: 1120, cms: 1120, st: { m: 390, d: 1200 } };
  const FOLD = { m: 844, d: 800 };

  const state = { id: null, device: 'm', view: 'design', actual: true, hot: false, last: {} };
  try {
    const saved = JSON.parse(localStorage.getItem('tenantecom-wf') || '{}');
    if (saved.device === 'm' || saved.device === 'd') state.device = saved.device;
    state.hot = !!saved.hot;
    if (saved.view === 'design' || saved.view === 'wire') state.view = saved.view;
    if (typeof saved.actual === 'boolean') state.actual = saved.actual;
  } catch (e) { /* storage unavailable: defaults are fine */ }
  const save = () => {
    try { localStorage.setItem('tenantecom-wf', JSON.stringify({ device: state.device, view: state.view, hot: state.hot, actual: state.actual })); } catch (e) { /* ignore */ }
  };

  const bySurface = (surf) => WF.screens.filter((s) => s.surface === surf);

  let builtFor = null;
  function buildIndex(surf) {
    if (builtFor === surf) return;
    builtFor = surf;
    const groups = new Map();
    bySurface(surf).forEach((s) => {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group).push(s);
    });
    const tagFor = (s) => (s.phase === 2 ? WF.tag.p2('P2') : '');
    $('#screen-list').innerHTML = [...groups]
      .map(([g, items]) => `<h3>${g}</h3><ul>${items.map((s) => `<li><a href="#${s.id}" data-id="${s.id}"><span>${s.title}</span>${tagFor(s)}</a></li>`).join('')}</ul>`)
      .join('');
    $('#screen-select').innerHTML = [...groups]
      .map(([g, items]) => `<optgroup label="${g}">${items.map((s) => `<option value="${s.id}">${s.title}${s.phase === 2 ? ' (Phase 2)' : ''}</option>`).join('')}</optgroup>`)
      .join('');
    $('#about').innerHTML = WF.surfaces[surf].about;
  }

  function renderNotes(s) {
    const meta = [
      s.route && ['Route', `<code>${s.route}</code>`],
      s.who && ['Who', s.who],
      s.data && ['Data', s.data.map((d) => `<code>${d}</code>`).join(' ')],
      s.docs && ['Spec', s.docs.map((d) => `<code>${d}</code>`).join(' ')],
    ].filter(Boolean);
    const hifi = s.surface !== 'st' && state.view === 'design';
    $('#notes').innerHTML = `<div class="n-main">
      ${hifi ? `<div class="callout small" style="margin-bottom:12px"><span><b>Design view.</b> This is how the admin is planned to look: Payload’s admin with one TenantEcom theme (logo, colours, fonts) plus our custom dashboard, order and order-update screens. Every vendor gets the same admin; only their logo and store name change. Switch to Wireframe to see where each note below points.</span></div>` : ''}
      <span class="eyebrow">${WF.surfaces[s.surface].label}${s.phase === 2 ? ' · Phase 2' : ''}</span>
      <h2>${s.title}</h2>
      <p class="purpose">${s.purpose}</p>
      <dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="legend">
        <div><span class="lg-box"></span>Solid: in the MVP</div>
        <div><span class="lg-box p2"></span>Dashed amber: Phase 2</div>
        <div>${WF.tag.flag('key')}<span>Shown only when that feature is switched on for the vendor</span></div>
        <div>${WF.pin('n')}<span>Matches a redline note above</span></div>
        <div>Click buttons, rows and menu items in the drawing to move between screens.</div>
      </div></div>
      ${s.notes && s.notes.length ? `<div class="n-red"><div class="rl-h"><span>Redlines</span></div><ol class="rl">${s.notes.map((n, i) => `<li>${WF.pin(i + 1)}<div>${n}</div></li>`).join('')}</ol></div>` : ''}`;
  }

  function fit() {
    const sheet = $('#sheet');
    const w = parseFloat(sheet.style.width) || 1;
    const avail = $('#viewport').clientWidth - 2;
    const z = state.actual ? 1 : Math.min(1, avail / w);
    sheet.style.zoom = String(z);
    $('#zoomlabel').textContent = `${Math.round(z * 100)}%`;
  }

  function render() {
    const s = WF.byId[state.id];
    const surf = s.surface;
    state.last[surf] = s.id;
    document.querySelectorAll('[data-surface]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.surface === surf)));
    $('#device').hidden = surf !== 'st';
    $('#view').hidden = surf === 'st';
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    document.querySelectorAll('[data-device]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.device === state.device)));
    $('#hot').setAttribute('aria-pressed', String(state.hot));
    $('#fit').textContent = state.actual ? 'Fit to screen' : 'Actual size (100%)';

    buildIndex(surf);
    document.querySelectorAll('#screen-list a').forEach((a) => (a.dataset.id === s.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#screen-select').value = s.id;

    const dev = surf === 'st' ? state.device : 'd';
    const width = surf === 'st' ? SIZES.st[dev] : SIZES[surf];
    const sheet = $('#sheet');
    sheet.className = `sheet wf dev-${dev} surf-${surf}${surf !== 'st' && state.view === 'design' ? ' hifi' : ''}${state.hot ? ' show-hot' : ''}${s.fixed ? ' fixed' : ''}`;
    sheet.style.width = `${width}px`;
    sheet.style.height = s.fixed && surf === 'st' ? `${FOLD[dev]}px` : '';
    let html;
    try {
      html = s.render({ dev });
    } catch (err) {
      html = `<div style="padding:24px" class="empty-state">This screen failed to draw: ${String(err && err.message)}</div>`;
    }
    if (surf === 'st' && !s.fixed) {
      html += `<div class="fold" style="top:${FOLD[dev]}px"><span>First screen · ${dev === 'm' ? '390 × 844' : '1200 × 800'}</span></div>`;
    }
    sheet.innerHTML = html;

    $('#crumb').textContent = `${WF.surfaces[surf].label} · ${s.group}`;
    $('#title').textContent = s.title;
    renderNotes(s);
    fit();
    const list = bySurface(surf);
    const i = list.indexOf(s);
    $('#prev').disabled = i <= 0;
    $('#next').disabled = i >= list.length - 1;
    $('#work').scrollTop = 0;
  }

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }

  function goTo(id) {
    if (!WF.byId[id]) { toast('That screen is not drawn yet.'); return; }
    if (location.hash.slice(1) === id) { state.id = id; render(); }
    else location.hash = id;
  }

  function fromHash() {
    const id = location.hash.slice(1);
    state.id = WF.byId[id] ? id : WF.screens[0].id;
    render();
  }

  $('#sheet').addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (!t) return;
    e.preventDefault();
    goTo(t.dataset.go);
  });
  document.querySelectorAll('[data-surface]').forEach((b) =>
    b.addEventListener('click', () => goTo(state.last[b.dataset.surface] || bySurface(b.dataset.surface)[0].id)));
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => { state.view = b.dataset.view; save(); render(); }));
  document.querySelectorAll('[data-device]').forEach((b) =>
    b.addEventListener('click', () => { state.device = b.dataset.device; save(); render(); }));
  $('#hot').addEventListener('click', () => { state.hot = !state.hot; save(); render(); });
  $('#fit').addEventListener('click', () => { state.actual = !state.actual; save(); render(); });
  $('#to-notes').addEventListener('click', () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#notes').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  });
  $('#screen-select').addEventListener('change', (e) => goTo(e.target.value));
  const step = (d) => {
    const list = bySurface(WF.byId[state.id].surface);
    const n = list[list.indexOf(WF.byId[state.id]) + d];
    if (n) goTo(n.id);
  };
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  window.addEventListener('hashchange', fromHash);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe($('#viewport'));
  else window.addEventListener('resize', fit);

  fromHash();
})();
