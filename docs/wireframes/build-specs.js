/* Builds docs/screens/*.md from the wireframe screens, so the screen specs never drift from the drawings.
   Run from the repo root after changing any wireframe:  node docs/wireframes/build-specs.js
   Intro text for each file lives in docs/wireframes/spec-intros/<surface>.md. No dependencies. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const here = __dirname;
const out = path.join(here, '..', 'screens');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['kit.js', 'super-admin.js', 'cms.js', 'storefront.js']) {
  vm.runInContext(fs.readFileSync(path.join(here, 'js', f), 'utf8'), ctx, { filename: f });
}
const WF = ctx.WF;

/* ---------- tiny HTML tree builder (the drawings are well-formed) ---------- */
const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link']);
function parse(html) {
  const root = { tag: 'root', cls: [], attrs: {}, kids: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { top.kids.push({ text: m[5] }); continue; }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { // closing
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const node = { tag, attrs, cls: (attrs.class || '').split(/\s+/).filter(Boolean), kids: [] };
    top.kids.push(node);
    if (!m[4] && !VOID.has(tag)) stack.push(node);
  }
  return root;
}
const has = (n, c) => n.cls && n.cls.includes(c);
const decode = (t) => t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function text(n) {
  if (n.text !== undefined) return decode(n.text);
  if (n.tag === 'svg') {
    const d = (n.kids.find((k) => k.attrs && k.attrs.d) || { attrs: {} }).attrs.d || '';
    return d.startsWith('M3 8.5 6.5 12') ? ' ✓ ' : d.startsWith('M5.5 7V5') || (n.kids[0] && n.kids[0].tag === 'rect' && n.kids[0].attrs.y === '7') ? ' (locked) ' : ' ';
  }
  if (has(n, 'pin')) return ' ';
  if (has(n, 'tg')) return has(n, 'lock') ? ' [locked] ' : has(n, 'on') ? ' [on] ' : ' [off] ';
  if (n.tag === 'em' && has(n, 't-p2')) return ` [${text({ kids: n.kids }).trim()}] `;
  if (n.tag === 'em' && has(n, 't-flag')) return ` [${text({ kids: n.kids }).trim()}] `;
  if (n.tag === 'em' && has(n, 't-later')) return ` [${text({ kids: n.kids }).trim()}] `;
  if (n.tag === 'br') return ' ';
  return n.kids.map((k) => ` ${text(k)} `).join('');
}
const tidy = (s) => s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
const T = (n) => tidy(text(n));
const find = (n, pred, acc = []) => { if (n.kids) n.kids.forEach((k) => { if (pred(k)) acc.push(k); find(k, pred, acc); }); return acc; };

/* chrome that repeats on every screen: documented once in the intro */
const SKIP = ['an', 'at', 'sf-hd', 'sf-ft', 'sf-bn', 'sf-ann', 'fabw', 'fold', 'tags'];

function outline(rootNode) {
  const lines = [];
  let acts = [];
  let actInd = '';
  const flush = () => { if (acts.length) { lines.push(`${actInd}- Actions: ${[...new Set(acts.filter(Boolean))].join(' · ')}`); acts = []; } };
  const act = (ind, t) => { if (!acts.length) actInd = ind; acts.push(t); };
  const push = (l) => { flush(); lines.push(l); };
  function walk(n, depth) {
    if (n.text !== undefined || !n.kids) return;
    if (SKIP.some((c) => has(n, c)) || n.tag === 'svg') return;
    const ind = '  '.repeat(depth);
    if (has(n, 'zn')) {
      const tagsNode = n.kids.find((k) => has(k, 'tags'));
      const t = tagsNode ? tidy(text(tagsNode)).replace(/\]\s*\[/g, ', ').replace(/^\[|\]$/g, '') : '';
      if (t) {
        push(`${ind}- Part shown only as: ${t}`);
        const before = lines.length;
        n.kids.forEach((k) => walk(k, depth + 1)); flush();
        // short labels (single-text spans, unlabelled images) produce no line of their own: keep the zone from printing empty
        if (lines.length === before) {
          const inner = tidy(n.kids.filter((k) => !has(k, 'tags')).map(text).join(' '));
          lines.push(`${ind}  - ${inner || (find(n, (k) => has(k, 'ph')).length ? 'Image' : '(drawn without a label)')}`);
        }
        return;
      }
    }
    if (has(n, 'ah')) { const h = find(n, (k) => k.tag === 'h2')[0]; const sub = find(n, (k) => has(k, 'sub'))[0]; push(`${ind}- Page title: ${h ? T(h) : ''}${sub ? ` (${T(sub)})` : ''}`); find(n, (k) => k.tag === 'button' && has(k, 'b')).forEach((b) => act(ind, T(b) || b.attrs['aria-label'] || '')); flush(); return; }
    if (has(n, 'card') && n.tag === 'section') {
      const ch = n.kids.find((k) => has(k, 'ch'));
      const title = ch ? T(ch.kids.find((k) => k.tag === 'h4') || ch) : '';
      if (title) push(`${ind}- **${title}**`);
      if (ch) find(ch, (k) => k.tag === 'button' && has(k, 'b')).forEach((b) => act(ind + '  ', T(b) || b.attrs['aria-label']));
      n.kids.filter((k) => !has(k, 'ch')).forEach((k) => walk(k, title ? depth + 1 : depth));
      flush(); return;
    }
    if (n.tag === 'table') {
      const cols = find(n, (k) => k.tag === 'th').map(T).filter(Boolean);
      // keep every row up to 40: rule tables (role matrix, plan features) must not lose rows; only long sample lists are cut
      const all = find(n, (k) => k.tag === 'tr' && k.kids.some((c) => c.tag === 'td'));
      const rows = all.slice(0, 40).map((r) => r.kids.filter((k) => k.tag === 'td').map((c) => T(c) || '—').join(' | '));
      push(`${ind}- Table${cols.length ? `: ${cols.join(', ')}` : ' (label | value)'}`);
      rows.filter(Boolean).forEach((r) => lines.push(`${ind}  - row: ${r}`));
      if (all.length > 40) lines.push(`${ind}  - (${all.length - 40} more sample rows)`);
      return;
    }
    if (has(n, 'fld')) {
      const l = n.kids.find((k) => has(k, 'fl')); const v = n.kids.find((k) => has(k, 'in')); const h = n.kids.find((k) => has(k, 'help'));
      const opt = v && has(v, 'sel') ? 'select' : v && has(v, 'ta') ? 'text area' : 'field';
      const label = l ? T(l) : '';
      const val = v ? T(v) : '';
      if (label || val) push(`${ind}- ${label ? `${opt[0].toUpperCase() + opt.slice(1)}: ${label}` : `${opt[0].toUpperCase() + opt.slice(1)}`}${val ? ` (sample: “${val}”)` : ''}${h ? ` — ${T(h)}` : ''}`);
      if (!l && !v) n.kids.forEach((k) => walk(k, depth));
      return;
    }
    if (has(n, 'tabs')) { push(`${ind}- Tabs: ${n.kids.map(T).filter(Boolean).join(' · ')}`); return; }
    if (n.tag === 'button' && (has(n, 'b') || has(n, 'ib'))) { const t = T(n) || n.attrs['aria-label']; if (t) act(ind, t); return; }
    // a phase or flag tag drawn beside a button belongs to that button
    if (n.tag === 'em' && has(n, 'tag')) { const t = T(n); if (acts.length) acts[acts.length - 1] += ` ${t}`; else if (t) push(`${ind}- ${t}`); return; }
    if (has(n, 'tgl')) { const tg = find(n, (k) => has(k, 'tg'))[0]; push(`${ind}- Switch: ${T(n) || '(no label)'}${tg && has(tg, 'lock') ? ' — locked, not in plan' : tg && has(tg, 'on') ? ' — on in sample' : ' — off in sample'}`); return; }
    if (has(n, 'ck') || has(n, 'rd')) { const t = T(n); if (t) push(`${ind}- ${has(n, 'ck') ? 'Checkbox' : 'Choice'}: ${t}${has(n, 'on') ? ' (selected in sample)' : ''}`); return; }
    if (has(n, 'kpi')) { const kl = find(n, (k) => has(k, 'kl'))[0]; const b = find(n, (k) => k.tag === 'b')[0]; const ks = find(n, (k) => has(k, 'ks'))[0]; push(`${ind}- Figure: ${kl ? T(kl) : ''} = ${b ? T(b) : ''}${ks ? ` (${T(ks)})` : ''}`); return; }
    if (has(n, 'meter')) { push(`${ind}- Usage bar: ${T(n)}`); return; }
    if (has(n, 'chart')) { push(`${ind}- Bar chart (x: ${T(n.kids.find((k) => has(k, 'xa')) || { kids: [] })})`); return; }
    if (has(n, 'list')) { n.kids.filter((k) => k.tag).forEach((k) => { const t = T(k); if (t) push(`${ind}- Row: ${t}${k.attrs['data-go'] ? ` → ${WF.byId[k.attrs['data-go']] ? WF.byId[k.attrs['data-go']].title : ''}` : ''}`); }); return; }
    if (has(n, 'callout') || has(n, 'banner') || has(n, 'empty-state')) { push(`${ind}- Notice: “${T(n)}”`); return; }
    if (has(n, 'sec-t')) { push(`${ind}- Section: ${T(n)}`); return; }
    if (has(n, 'pc')) { push(`${ind}- Product card: ${T(n)}`); return; }
    if (has(n, 'wa-b') || has(n, 'sms-b')) { push(`${ind}- ${has(n, 'me') ? 'Shopper reply' : 'Message'}: “${T(n)}”`); return; }
    if (has(n, 'wa-btn')) { push(`${ind}- Message button: ${T(n)}`); return; }
    if (has(n, 'wa-day')) { push(`${ind}- Day divider: ${T(n)}`); return; }
    if (has(n, 'track') || has(n, 'steps')) { push(`${ind}- Progress: ${n.kids.map(T).filter(Boolean).join(' → ')}`); return; }
    if (has(n, 'accordion')) { n.kids.forEach((k) => { const t = T(k); if (t) push(`${ind}- FAQ item: ${t}`); }); return; }
    if (has(n, 'otp')) { push(`${ind}- 6-digit code boxes`); return; }
    if (has(n, 'ph')) { const t = T(n); if (t) push(`${ind}- Image: ${t}`); return; }
    if (has(n, 'stickybar')) { push(`${ind}- Sticky bottom bar (phone): ${T(n)}`); return; }
    if (has(n, 'fl') && !has(n, 'fld')) { return; }
    if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(n.tag)) { const t = T(n); if (t) push(`${ind}- Heading: ${t}`); return; }
    if (n.tag === 'p' || n.tag === 'figure' || n.tag === 'li') { const t = T(n); if (t) push(`${ind}- Text: ${t}`); return; }
    if (has(n, 'crumb')) { push(`${ind}- Breadcrumb: ${n.kids.map(T).filter(Boolean).join(' › ')}`); return; }
    if (n.tag === 'nav' || n.tag === 'ul' || n.tag === 'ol') { n.kids.forEach((k) => walk(k, depth)); return; }
    // small leaf blocks of plain text (e.g. dl pairs, labels)
    const leafy = n.kids.every((k) => k.text !== undefined || ['b', 'span', 'em', 'u', 'i', 's', 'strong', 'br', 'svg', 'code'].includes(k.tag));
    if (leafy && n.kids.some((k) => k.tag !== 'svg')) { const t = T(n); if (t && t.length > 1 && !(has(n, 'pl'))) { if (n.tag === 'div' || n.tag === 'span' && n.kids.length > 1) push(`${ind}- ${t}`); } return; }
    n.kids.forEach((k) => walk(k, depth));
  }
  walk(rootNode, 0);
  flush();
  return lines.filter((l, i) => l.trim() !== '-' && (i === 0 || l !== lines[i - 1]));
}

function contentRoot(tree, s) {
  if (s.fixed) { const ov = find(tree, (k) => has(k, 'overlay'))[0]; if (ov) return ov; }
  return tree;
}

const files = { sa: 'super-admin.md', cms: 'vendor-cms.md', st: 'storefront.md' };
fs.mkdirSync(out, { recursive: true });
for (const [surf, file] of Object.entries(files)) {
  const intro = fs.readFileSync(path.join(here, 'spec-intros', `${surf}.md`), 'utf8').trim();
  const screens = WF.screens.filter((s) => s.surface === surf);
  const parts = [intro, '', '## Screen index', ''];
  let group = null;
  screens.forEach((s) => {
    if (s.group !== group) { group = s.group; parts.push('', `**${group}**`, ''); }
    parts.push(`- [${s.title}](#${s.id}) \`${s.id}\`${s.phase === 2 ? ' (Phase 2)' : ''}`);
  });
  parts.push('');
  screens.forEach((s) => {
    const root = contentRoot(parse(s.render({ dev: 'd' })), s);
    const gos = find(root, (k) => k.attrs && k.attrs['data-go'] && !SKIP.some((c) => has(k, c)));
    // links from inside the page body only (menus excluded)
    const inChrome = new Set(find(root, (k) => SKIP.some((c) => has(k, c))).flatMap((c) => find(c, (k) => k.attrs && k.attrs['data-go'])));
    const links = [...new Set(gos.filter((k) => !inChrome.has(k)).map((k) => k.attrs['data-go']))].filter((g) => g !== s.id && WF.byId[g]);
    const ref = (g) => `[${WF.byId[g].title}](${WF.byId[g].surface === surf ? '' : files[WF.byId[g].surface]}#${g})`;
    parts.push(`<a id="${s.id}"></a>`, '', `## ${s.title}${s.phase === 2 ? ' (Phase 2)' : ''}`, '', s.purpose, '');
    if (s.route) parts.push(`- **Route:** \`${s.route}\``);
    if (s.who) parts.push(`- **Who:** ${s.who}`);
    if (s.data) parts.push(`- **Collections:** ${s.data.map((d) => `\`${d}\``).join(', ')}`);
    if (s.docs) parts.push(`- **Read first:** ${s.docs.map((d) => `\`${d}\``).join(', ')}`);
    parts.push(`- **Wireframe:** \`docs/wireframes/index.html#${s.id}\``);
    if (links.length) parts.push(`- **Links to:** ${links.map(ref).join(', ')}`);
    parts.push('', '### On the screen (top to bottom, sample data)', '', ...outline(root), '');
    if (s.notes && s.notes.length) parts.push('### Rules and behaviour', '', ...s.notes.map((n, i) => `${i + 1}. ${tidy(text(parse(n)))}`), '');
  });
  fs.writeFileSync(path.join(out, file), parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', 'utf8');
  console.log(file, screens.length, 'screens');
}
