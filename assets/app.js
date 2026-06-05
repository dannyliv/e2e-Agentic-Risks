/* Securing the Agentic Enterprise - interactive companion
   Deployment threat map, taxonomy explorer, solution mapping, recommendations. */
'use strict';
const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const sev_rank = { Critical: 3, High: 2, Medium: 1 };
const SEVC = { Critical: '#ff5470', High: '#ff9f43', Medium: '#4cc3ff' };

function gapKey(s) {
  if (!s) return 'Under';
  if (s.startsWith('Open')) return 'Open';
  if (s.startsWith('Under')) return 'Under';
  if (s.startsWith('Partial')) return 'Partially';
  if (s.startsWith('Well')) return 'Well';
  return 'Under';
}
function el(tag, attrs = {}, html) { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (html != null) n.innerHTML = html; return n; }
function svg(tag, attrs = {}, kids) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(c => c && n.appendChild(c)); return n; }
function txt(s) { return document.createTextNode(s); }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let DATA, RISK_BY_ID, RISKS_BY_LAYER;

/* ---------------- diagram layout ---------------- */
const W = 1100, H = 575;
const CW = 188, CH = 92, CHs = 96;
const LAYOUT = {
  L1: { x: 35,  y: 156, w: CW, h: CHs },
  L4: { x: 256, y: 104, w: CW, h: CH },
  L2: { x: 256, y: 212, w: CW, h: CH },
  L3: { x: 478, y: 156, w: 168, h: CHs },
  L5: { x: 662, y: 104, w: CW, h: CH },
  L6: { x: 662, y: 212, w: CW, h: CH },
  L7: { x: 878, y: 104, w: CW, h: CH },
  L8: { x: 878, y: 212, w: CW, h: CH },
  L9:  { x: 35, y: 346, w: 1031, h: 56, plane: 1 },
  L10: { x: 35, y: 416, w: 1031, h: 56, plane: 1 },
  L11: { x: 35, y: 486, w: 1031, h: 56, plane: 1 },
};
const BANDS = [
  { t: 'Ingress', x: 129 }, { t: 'Reasoning / Runtime', x: 350 }, { t: 'Model', x: 562 },
  { t: 'Action / Tools', x: 756 }, { t: 'Data, Memory & Mesh', x: 972 },
];
const TBCHIPS = [
  { x: 24,  t: 'TB0', full: 'Public internet: fully untrusted' },
  { x: 234, t: 'TB1', full: 'Untrusted content crosses into the instruction context' },
  { x: 464, t: 'TB2', full: 'Model / context-window boundary' },
  { x: 654, t: 'TB3', full: 'Model intent becomes a real-world action' },
  { x: 866, t: 'TB5', full: 'Trust in peer agents and external services' },
];
const TBV = [234, 464, 654, 866];
const BACK = new Set(['L3>L2', 'L6>L4', 'L7>L4', 'L8>L4', 'L6>L1', 'L2>L10', 'L5>L10', 'L6>L10']);
const anchorsOf = L => ({ cx: L.x + L.w / 2, cy: L.y + L.h / 2, l: [L.x, L.y + L.h / 2], r: [L.x + L.w, L.y + L.h / 2], t: [L.x + L.w / 2, L.y], b: [L.x + L.w / 2, L.y + L.h] });
const SHORT = { L1: 'Human & Input Channels', L2: 'Orchestration & Runtime', L3: 'Foundation Model / Gateway', L4: 'Prompt & Context Assembly', L5: 'Tools & Function Calling', L6: 'External Data, SaaS & Actions', L7: 'Memory & Vector / RAG', L8: 'Other Agents (A2A Mesh)', L9: 'Identity, Secrets & Authorization', L10: 'Observability & Governance', L11: 'Supply Chain & Provenance' };

function layerSeverity(lid) {
  const rs = RISKS_BY_LAYER[lid] || [];
  let best = 0, sev = 'Medium';
  rs.forEach(r => { const k = sev_rank[r.severity] || 1; if (k > best) { best = k; sev = r.severity; } });
  return { sev, n: rs.length };
}

function addDefs(map) {
  const defs = svg('defs');
  const cg = svg('linearGradient', { id: 'cardgrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  cg.appendChild(svg('stop', { offset: '0', 'stop-color': '#182433' }));
  cg.appendChild(svg('stop', { offset: '1', 'stop-color': '#0a121d' }));
  defs.appendChild(cg);
  const pg = svg('linearGradient', { id: 'planegrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  pg.appendChild(svg('stop', { offset: '0', 'stop-color': '#121d2c' }));
  pg.appendChild(svg('stop', { offset: '1', 'stop-color': '#0a1119' }));
  defs.appendChild(pg);
  const sh = svg('linearGradient', { id: 'sheen', x1: '0', y1: '0', x2: '0', y2: '1' });
  sh.appendChild(svg('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '0.08' }));
  sh.appendChild(svg('stop', { offset: '0.5', 'stop-color': '#ffffff', 'stop-opacity': '0' }));
  defs.appendChild(sh);
  const fg = svg('linearGradient', { id: 'flowgrad', x1: '0', y1: '0', x2: '1', y2: '0' });
  fg.appendChild(svg('stop', { offset: '0', 'stop-color': '#41e0d6', 'stop-opacity': '0.95' }));
  fg.appendChild(svg('stop', { offset: '1', 'stop-color': '#41e0d6', 'stop-opacity': '0.2' }));
  defs.appendChild(fg);
  const flt = svg('filter', { id: 'glow', x: '-40%', y: '-40%', width: '180%', height: '180%' });
  flt.appendChild(svg('feDropShadow', { dx: '0', dy: '0', stdDeviation: '7', 'flood-color': '#41e0d6', 'flood-opacity': '0.6' }));
  defs.appendChild(flt);
  const mk = svg('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6.5', markerHeight: '6.5', orient: 'auto-start-reverse' });
  mk.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#41e0d6' }));
  defs.appendChild(mk);
  const mk2 = svg('marker', { id: 'arrowd', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
  mk2.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#34465f' }));
  defs.appendChild(mk2);
  map.appendChild(defs);
}

function buildMap() {
  const map = $('#map');
  map.setAttribute('viewBox', `0 0 ${W} ${H}`);
  addDefs(map);

  // band labels
  BANDS.forEach(b => map.appendChild(svg('text', { x: b.x, y: 54, 'text-anchor': 'middle', class: 'band-label' }, [txt(b.t)])));

  // vertical trust-boundary lines
  TBV.forEach(x => map.appendChild(svg('line', { x1: x, y1: 92, x2: x, y2: 312, class: 'tb-line' })));
  map.appendChild(svg('line', { x1: 22, y1: 100, x2: 22, y2: 312, class: 'tb-line' }));

  // planes (background)
  ['L9', 'L10', 'L11'].forEach(id => drawPlane(map, id));

  // flows
  const fg = svg('g', {});
  DATA.diagram.data_flow.forEach(e => {
    const A = LAYOUT[e.from], B = LAYOUT[e.to];
    if (!A || !B) return;
    fg.appendChild(flow(A, B, BACK.has(e.from + '>' + e.to)));
  });
  map.appendChild(fg);

  // TB chips on top (above cards, never overlapping)
  TBCHIPS.forEach(tb => map.appendChild(tbChip(tb)));

  // core cards
  ['L1', 'L4', 'L2', 'L3', 'L5', 'L6', 'L7', 'L8'].forEach(id => drawCard(map, id));
  ['L9', 'L10', 'L11'].forEach(id => labelPlane(map, id));
}

function tbChip(tb) {
  const g = svg('g', { class: 'tb-chip' });
  const w = 34, h = 18, x = tb.x - w / 2, y = 68;
  g.appendChild(svg('rect', { x, y, width: w, height: h, rx: 9 }));
  g.appendChild(svg('text', { x: tb.x, y: y + 13, 'text-anchor': 'middle' }, [txt(tb.t)]));
  g.appendChild(svg('title', {}, [txt(tb.full)]));
  return g;
}

function flow(A, B, back) {
  const a = anchorsOf(A), b = anchorsOf(B);
  let p1, p2;
  if (Math.abs(a.cy - b.cy) < 30 && b.cx > a.cx) { p1 = a.r; p2 = b.l; }
  else if (Math.abs(a.cy - b.cy) < 30 && b.cx < a.cx) { p1 = a.l; p2 = b.r; }
  else if (b.cy > a.cy) { p1 = a.b; p2 = b.t; }
  else { p1 = a.t; p2 = b.b; }
  const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
  const d = `M${p1[0]},${p1[1]} Q${mx},${p1[1]} ${mx},${my} T${p2[0]},${p2[1]}`;
  return svg('path', { d, class: 'flow ' + (back ? 'data' : 'fwd') });
}

function cardBadge(g, L, sev, n) {
  const w = 30, bx = L.x + L.w - w - 12, by = L.y + 12;
  g.appendChild(svg('rect', { x: bx, y: by, width: w, height: 18, rx: 9, fill: 'rgba(0,0,0,.4)', stroke: SEVC[sev], 'stroke-width': 1.2 }));
  g.appendChild(svg('text', { class: 'rc', x: bx + w / 2, y: by + 13, 'text-anchor': 'middle', fill: SEVC[sev] }, [txt(String(n))]));
}

function drawCard(map, id) {
  const L = LAYOUT[id], a = DATA.architecture.layers.find(x => x.id === id) || {};
  const { sev, n } = layerSeverity(id);
  const g = svg('g', { class: 'layer-card', 'data-layer': id, tabindex: '0', role: 'button', 'aria-label': SHORT[id] });
  // depth shadow / extrusion
  g.appendChild(svg('rect', { x: L.x + 3, y: L.y + 5, width: L.w, height: L.h, rx: 12, fill: '#03060b', opacity: '0.55' }));
  // body
  g.appendChild(svg('rect', { class: 'body', x: L.x, y: L.y, width: L.w, height: L.h, rx: 12, fill: 'url(#cardgrad)', stroke: '#2a3a55', 'stroke-width': 1.2 }));
  // top sheen
  g.appendChild(svg('rect', { x: L.x + 1, y: L.y + 1, width: L.w - 2, height: L.h * 0.5, rx: 11, fill: 'url(#sheen)' }));
  // severity accent bar (left)
  g.appendChild(svg('rect', { x: L.x, y: L.y + 9, width: 3.5, height: L.h - 18, rx: 2, fill: SEVC[sev] }));
  // id + badge + name
  g.appendChild(svg('text', { class: 'lid', x: L.x + 16, y: L.y + 25 }, [txt(id)]));
  cardBadge(g, L, sev, n);
  wrapText(g, SHORT[id], L.x + 16, L.y + 51, L.w - 26, 15, 'lname', 2);
  g.addEventListener('click', () => openLayer(id));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayer(id); } });
  map.appendChild(g);
}

function drawPlane(map, id) {
  const L = LAYOUT[id];
  const g = svg('g', { class: 'plane layer-card', 'data-layer': id, tabindex: '0', role: 'button', 'aria-label': SHORT[id] });
  g.appendChild(svg('rect', { x: L.x + 2, y: L.y + 4, width: L.w, height: L.h, rx: 12, fill: '#03060b', opacity: '0.5' }));
  g.appendChild(svg('rect', { class: 'body', x: L.x, y: L.y, width: L.w, height: L.h, rx: 12, fill: 'url(#planegrad)', stroke: '#243349', 'stroke-width': 1.1, 'stroke-dasharray': '1 0' }));
  g.appendChild(svg('rect', { x: L.x + 1, y: L.y + 1, width: L.w - 2, height: L.h * 0.45, rx: 11, fill: 'url(#sheen)' }));
  g.addEventListener('click', () => openLayer(id));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayer(id); } });
  map.appendChild(g);
}

function labelPlane(map, id) {
  const L = LAYOUT[id];
  const { sev, n } = layerSeverity(id);
  const tag = { L9: 'TB4 identity boundary', L10: 'TB7 control plane: out-of-band, highest trust', L11: 'TB6 provenance boundary' }[id];
  const g = map.querySelector(`g.plane[data-layer="${id}"]`);
  g.appendChild(svg('rect', { x: L.x, y: L.y + 9, width: 3.5, height: L.h - 18, rx: 2, fill: SEVC[sev] }));
  g.appendChild(svg('text', { class: 'lid', x: L.x + 18, y: L.y + 23 }, [txt(id)]));
  g.appendChild(svg('text', { x: L.x + 52, y: L.y + 23, style: 'fill:#eaeef6;font-family:var(--font-ui);font-size:14.5px;font-weight:600' }, [txt(SHORT[id])]));
  g.appendChild(svg('text', { class: 'plane-label-tag', x: L.x + 52, y: L.y + 41 }, [txt(tag)]));
  const bw = 150, bx = L.x + L.w - bw - 16;
  g.appendChild(svg('rect', { x: bx, y: L.y + 16, width: bw, height: 24, rx: 12, fill: 'rgba(0,0,0,.35)', stroke: SEVC[sev], 'stroke-width': 1.1 }));
  g.appendChild(svg('text', { x: bx + bw / 2, y: L.y + 32, 'text-anchor': 'middle', class: 'rc', fill: SEVC[sev] }, [txt(n + ' risks on this plane')]));
}

function wrapText(g, str, x, y, maxw, fs, cls, maxlines) {
  const words = (str || '').split(' '); let line = '', lines = []; const cpl = Math.max(8, Math.floor(maxw / (fs * 0.54)));
  words.forEach(w => { if ((line + ' ' + w).trim().length > cpl) { lines.push(line.trim()); line = w; } else line += ' ' + w; });
  if (line.trim()) lines.push(line.trim());
  lines = lines.slice(0, maxlines);
  lines.forEach((ln, i) => g.appendChild(svg('text', { class: cls, x, y: y + i * (fs + 4) }, [txt(ln)])));
}

/* ---------------- drawer ---------------- */
const mask = $('#mask'), drawer = $('#drawer');
function closeDrawer() { drawer.classList.remove('open'); mask.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.querySelectorAll('.layer-card.active').forEach(n => n.classList.remove('active')); }
$('#dclose').addEventListener('click', closeDrawer);
mask.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

function openLayer(id) {
  const a = DATA.architecture.layers.find(x => x.id === id) || {};
  const ds = DATA.diagram.layers.find(x => x.id === id) || {};
  document.querySelectorAll('.layer-card.active').forEach(n => n.classList.remove('active'));
  const node = document.querySelector(`.layer-card[data-layer="${id}"]`); if (node) node.classList.add('active');
  $('#dlid').textContent = id + '  ·  ' + (a.trust_boundary || '');
  $('#dname').textContent = SHORT[id] || a.name;
  $('#dsum').textContent = (ds.summary || a.description || '').replace(/\s+/g, ' ').trim();
  const body = $('#dbody'); body.innerHTML = '';
  if (ds.surfaces && ds.surfaces.length) {
    body.appendChild(secLabel('Attack surfaces'));
    const wrap = el('div'); ds.surfaces.forEach(s => wrap.appendChild(el('span', { class: 'surf-tag' }, esc(s.label))));
    body.appendChild(wrap);
  }
  const rs = (RISKS_BY_LAYER[id] || []).slice().sort((x, y) => (sev_rank[y.severity] - sev_rank[x.severity]));
  body.appendChild(secLabel(`Risks on this layer (${rs.length})`));
  rs.forEach(r => body.appendChild(riskAccordion(r)));
  openPanel();
}
function secLabel(t) { const h = el('h5', {}, esc(t)); h.style.cssText = 'font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-size:11px;color:var(--cy);margin:20px 0 8px'; return h; }
function openRisk(rid) {
  const r = RISK_BY_ID[rid]; if (!r) return;
  $('#dlid').textContent = r.id + '  ·  ' + (r.family_name || '');
  $('#dname').textContent = r.name;
  $('#dsum').textContent = r.short_def || '';
  const body = $('#dbody'); body.innerHTML = '';
  const ac = riskAccordion(r); ac.classList.add('open'); body.appendChild(ac);
  openPanel();
}
function openPanel() { drawer.classList.add('open'); mask.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('#dbody').scrollTop = 0; }

function riskAccordion(r) {
  const box = el('div', { class: 'risk' });
  const head = el('div', { class: 'risk-h' });
  head.innerHTML = `<span class="rid">${r.id}</span><span class="rname">${esc(r.name)}</span>
    <span class="chip sev-${r.severity}">${r.severity}</span><span class="chev">&rsaquo;</span>`;
  box.appendChild(head);
  const d = el('div', { class: 'risk-d' });
  const ids = [].concat(r.owasp_llm || [], (r.owasp_agentic || []).map(x => 'Agentic ' + x)).join(' &middot; ');
  let html = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px">
     <span class="gap gap-${gapKey(r.gap_status)}">${esc(r.gap_status)}</span>
     ${(r.layers || []).map(l => `<span class="surf-tag">${l}</span>`).join('')}</div>`;
  if (ids) html += `<p style="font-family:var(--font-mono);font-size:11.5px;color:var(--fg-faint)">${ids}</p>`;
  html += `<h5>Mechanism</h5><p>${esc(r.mechanism)}</p>`;
  if (r.enterprise_relevance) html += `<h5>Why it matters</h5><p>${esc(r.enterprise_relevance)}</p>`;
  if (r.primary_examples && r.primary_examples.length) {
    html += `<h5>Validated example${r.primary_examples.length > 1 ? 's' : ''}</h5>`;
    r.primary_examples.forEach(ex => {
      html += `<div class="ex"><a href="${encodeURI(ex.url)}" target="_blank" rel="noopener">${esc(ex.title)}</a>
        <div class="meta">${[ex.agent, ex.date].filter(Boolean).map(esc).join(' · ')}</div></div>`;
    });
  }
  if (r.solutions && r.solutions.length) {
    html += `<h5>Controls that help</h5>`;
    r.solutions.forEach(s => {
      html += `<div class="sol"><span class="cov cov-${s.coverage}">${s.coverage}</span>
        <span><b>${esc(s.name)}</b>${s.is_author_oss ? ' <span class="oss-flag">author OSS research</span>' : ''}. ${esc(s.how_it_helps)}</span></div>`;
    });
  }
  if (r.residual_gap) html += `<h5>Residual gap</h5><p>${esc(r.residual_gap)}</p>`;
  if (r.recommended_e2e_mitigation) html += `<h5>Recommended end-to-end mitigation</h5><p>${esc(r.recommended_e2e_mitigation)}</p>`;
  d.innerHTML = html;
  box.appendChild(d);
  head.addEventListener('click', () => box.classList.toggle('open'));
  return box;
}

/* ---------------- explorer ---------------- */
let FILT = { family: 'all', severity: 'all', gap: 'all' };
function buildExplorer() {
  const fbar = $('#filters');
  const fams = [['all', 'All families']].concat(DATA.families.map(f => [f.id, f.name.replace(/ &.*/, '')]));
  const sevs = [['all', 'All'], ['Critical', 'Critical'], ['High', 'High'], ['Medium', 'Medium']];
  const gaps = [['all', 'All'], ['Open', 'Open problem'], ['Under', 'Under-served'], ['Partially', 'Partially-addressed'], ['Well', 'Well-addressed']];
  fbar.appendChild(groupFilters('family', fams));
  fbar.appendChild(el('span', { style: 'flex-basis:100%;height:0' }));
  fbar.appendChild(groupFilters('severity', sevs, 'Severity'));
  fbar.appendChild(groupFilters('gap', gaps, 'Coverage'));
  renderGrid();
}
function groupFilters(key, opts, label) {
  const g = el('span', { style: 'display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center' });
  if (label) g.appendChild(el('span', { class: 'fl' }, label));
  opts.forEach(([v, t]) => {
    const b = el('button', { class: 'fbtn' + (FILT[key] === v ? ' on' : ''), 'data-k': key, 'data-v': v }, esc(t));
    b.addEventListener('click', () => { FILT[key] = v; document.querySelectorAll(`.fbtn[data-k="${key}"]`).forEach(x => x.classList.toggle('on', x.dataset.v === v)); renderGrid(); });
    g.appendChild(b);
  });
  return g;
}
function renderGrid() {
  const grid = $('#grid'); grid.innerHTML = '';
  const rs = DATA.risks.filter(r =>
    (FILT.family === 'all' || r.family_id === FILT.family) &&
    (FILT.severity === 'all' || r.severity === FILT.severity) &&
    (FILT.gap === 'all' || gapKey(r.gap_status) === FILT.gap));
  if (!rs.length) { grid.appendChild(el('p', { style: 'color:var(--fg-mute)' }, 'No risks match these filters.')); return; }
  rs.forEach(r => {
    const c = el('div', { class: 'card' });
    c.appendChild(el('span', { class: 'stripe', style: `background:${SEVC[r.severity]};color:${SEVC[r.severity]}` }));
    const ex0 = (r.primary_examples || [])[0];
    c.innerHTML += `<div class="top"><span class="rid">${r.id}</span><span class="chip sev-${r.severity}">${r.severity}</span><span class="gap gap-${gapKey(r.gap_status)}">${esc(shortGap(r.gap_status))}</span></div>
      <h4>${esc(r.name)}</h4>
      <div class="def">${esc(r.short_def)}</div>
      <div class="foot">${(r.layers || []).slice(0, 4).map(l => `<span class="surf-tag">${l}</span>`).join('')}<span class="fam">${esc((r.family_name || '').split(' ')[0])}</span></div>`;
    if (ex0) c.appendChild(el('div', { class: 'meta', style: 'font-family:var(--font-mono);font-size:10.5px;color:var(--fg-faint);margin-top:11px' }, '&rarr; ' + esc(ex0.title.slice(0, 58)) + (ex0.title.length > 58 ? '...' : '')));
    c.addEventListener('click', () => openRisk(r.id));
    attachGlow(c);
    grid.appendChild(c);
  });
}
function shortGap(s) { return ({ Open: 'Open problem', Under: 'Under-served', Partially: 'Partial', Well: 'Well-addressed' })[gapKey(s)]; }

/* ---------------- mapping table ---------------- */
function buildMapping() {
  const t = $('#maptable');
  t.innerHTML = `<thead><tr><th>ID</th><th>Risk</th><th>Family</th><th>Sev</th><th>Layers</th><th>Lead controls</th><th>Coverage gap</th></tr></thead>`;
  const tb = el('tbody');
  DATA.risks.forEach(r => {
    const tr = el('tr');
    const sols = (r.solutions || []).slice(0, 3).map(s => esc(s.name)).join(', ');
    const gc = { Open: 'var(--gap-open)', Under: 'var(--gap-under)', Partially: 'var(--gap-part)', Well: 'var(--gap-well)' }[gapKey(r.gap_status)];
    tr.innerHTML = `<td class="rid">${r.id}</td><td class="rname">${esc(r.name)}</td>
      <td style="font-size:12px;color:var(--fg-mute)">${esc((r.family_name || '').replace(/ &.*/, ''))}</td>
      <td><span class="chip sev-${r.severity}" style="font-size:10px">${r.severity[0]}</span></td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--fg-faint)">${(r.layers || []).join(' ')}</td>
      <td style="font-size:12.5px">${sols}</td>
      <td class="gapcell" style="color:${gc}">${esc(r.gap_status)}</td>`;
    tr.addEventListener('click', () => openRisk(r.id));
    tr.style.cursor = 'pointer';
    tb.appendChild(tr);
  });
  t.appendChild(tb);
}

/* ---------------- recommendations ---------------- */
function buildRecs() {
  const g = $('#recsgrid');
  (DATA.cross_cutting_recommendations || []).forEach((r, i) => {
    const c = el('div', { class: 'rec' });
    const ci = r.indexOf(':');
    const head = (ci > 3 && ci < 112) ? r.slice(0, ci).trim() : ('Move ' + (i + 1));
    const bodyTxt = (ci > 3 && ci < 112) ? r.slice(ci + 1).trim() : r;
    c.innerHTML = `<div class="num">${String(i + 1).padStart(2, '0')}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:18.5px;color:var(--fg);margin-top:8px">${esc(head)}</div>
      <p>${esc(bodyTxt)}</p>`;
    attachTilt(c);
    g.appendChild(c);
  });
}

/* ---------------- effects ---------------- */
function attachGlow(node) {
  node.addEventListener('pointermove', e => {
    const b = node.getBoundingClientRect();
    node.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100) + '%');
    node.style.setProperty('--my', ((e.clientY - b.top) / b.height * 100) + '%');
  });
}
function attachTilt(node) {
  attachGlow(node);
  node.addEventListener('pointermove', e => {
    const b = node.getBoundingClientRect();
    const rx = ((e.clientY - b.top) / b.height - 0.5) * -5;
    const ry = ((e.clientX - b.left) / b.width - 0.5) * 5;
    node.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  node.addEventListener('pointerleave', () => { node.style.transform = ''; });
}
function initReveal() {
  const targets = document.querySelectorAll('.sec-head, .diagram-shell, #grid, .filters, .table-scroll, #recsgrid, .dl-row, .stat-row, .disclaimer');
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  targets.forEach(t => { t.classList.add('ros'); io.observe(t); });
}

/* ---------------- boot ---------------- */
fetch('assets/data.json').then(r => r.json()).then(d => {
  DATA = d;
  RISK_BY_ID = {}; d.risks.forEach(r => RISK_BY_ID[r.id] = r);
  RISKS_BY_LAYER = {};
  d.risks.forEach(r => (r.layers || []).forEach(l => { (RISKS_BY_LAYER[l] = RISKS_BY_LAYER[l] || []).push(r); }));
  buildMap(); buildExplorer(); buildMapping(); buildRecs();
  document.querySelectorAll('.dl').forEach(attachTilt);
  document.querySelectorAll('.stat').forEach(attachGlow);
  initReveal();
}).catch(e => { console.error(e); $('#mapwrap').innerHTML = '<p style="color:var(--crit);padding:30px">Failed to load data.json: ' + esc(String(e)) + '</p>'; });
