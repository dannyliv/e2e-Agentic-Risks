/* Securing the Agentic Enterprise - interactive companion
   Deployment threat map (desktop SVG + mobile stack), taxonomy explorer, mapping, recommendations. */
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

const SHORT = { L1: 'Human & Input Channels', L2: 'Orchestration & Runtime', L3: 'Foundation Model / Gateway', L4: 'Prompt & Context Assembly', L5: 'Tools & Function Calling', L6: 'External Data, SaaS & Actions', L7: 'Memory & Vector / RAG', L8: 'Other Agents (A2A Mesh)', L9: 'Identity, Secrets & Authorization', L10: 'Observability & Governance', L11: 'Supply Chain & Provenance' };

/* ---------------- desktop diagram layout ----------------
   Clean linear request pipeline (L1->L4->L2->L5->L6) with branch cards
   (L3 model, L7 memory, L8 agents) and three cross-cutting foundation planes.
   Every connector runs in a clear channel; nothing is drawn under a card. */
const W = 1180, H = 612;
const CW = 162, CH = 96, BH = 88, PW = 1108, PH = 50;
const PIPE_Y = 138, BR_Y = 296;
const COL = { L1: 36, L4: 272, L2: 508, L5: 744, L6: 980 };       // pipeline (5 across)
const BRX = { L7: 272, L3: 508, L8: 744 };                         // branch cards under L4/L2/L5
const PLANE = { L9: 412, L10: 474, L11: 536 };
const LAYOUT = {};
['L1', 'L4', 'L2', 'L5', 'L6'].forEach(id => LAYOUT[id] = { x: COL[id], y: PIPE_Y, w: CW, h: CH });
['L7', 'L3', 'L8'].forEach(id => LAYOUT[id] = { x: BRX[id], y: BR_Y, w: CW, h: BH });
['L9', 'L10', 'L11'].forEach(id => LAYOUT[id] = { x: 36, y: PLANE[id], w: PW, h: PH, plane: 1 });

const cx = id => LAYOUT[id].x + LAYOUT[id].w / 2;
const cy = id => LAYOUT[id].y + LAYOUT[id].h / 2;

const TBCHIPS = [
  { x: 20,  t: 'TB0', full: 'Public internet: fully untrusted' },
  { x: 234, t: 'TB1', full: 'Untrusted content crosses into the instruction context (L4)' },
  { x: 706, t: 'TB3', full: 'Model intent becomes a real-world action (L5 tools)' },
  { x: 942, t: 'TB5', full: 'Trust in peer agents and external services' },
];

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
  pg.appendChild(svg('stop', { offset: '0', 'stop-color': '#101b2a' }));
  pg.appendChild(svg('stop', { offset: '1', 'stop-color': '#0a1019' }));
  defs.appendChild(pg);
  const sh = svg('linearGradient', { id: 'sheen', x1: '0', y1: '0', x2: '0', y2: '1' });
  sh.appendChild(svg('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '0.09' }));
  sh.appendChild(svg('stop', { offset: '0.5', 'stop-color': '#ffffff', 'stop-opacity': '0' }));
  defs.appendChild(sh);
  const flt = svg('filter', { id: 'glow', x: '-40%', y: '-40%', width: '180%', height: '180%' });
  flt.appendChild(svg('feDropShadow', { dx: '0', dy: '0', stdDeviation: '7', 'flood-color': '#41e0d6', 'flood-opacity': '0.6' }));
  defs.appendChild(flt);
  for (const [id, col] of [['arrow', '#41e0d6'], ['arrowd', '#6f7f9c']]) {
    const mk = svg('marker', { id, viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    mk.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: col }));
    defs.appendChild(mk);
  }
  map.appendChild(defs);
}

function line(x1, y1, x2, y2, cls) { return svg('line', { x1, y1, x2, y2, class: cls }); }

function buildMap() {
  const map = $('#map');
  map.setAttribute('viewBox', `0 0 ${W} ${H}`);
  addDefs(map);

  // stage labels
  map.appendChild(svg('text', { x: 36, y: 36, class: 'stage-label' }, [txt('THE REQUEST PATH')]));
  map.appendChild(svg('text', { x: 36, y: 36 + 0, class: 'stage-label', style: 'opacity:0' }, [txt('')]));
  map.appendChild(svg('text', { x: 36, y: BR_Y - 14, class: 'stage-label' }, [txt('MEMORY, MODEL & MESH')]));
  map.appendChild(svg('text', { x: 36, y: PLANE.L9 - 14, class: 'stage-label' }, [txt('CROSS-CUTTING CONTROL & SUPPLY PLANES  ·  every layer above runs on these')]));

  // foundation planes (drawn first, as background)
  ['L9', 'L10', 'L11'].forEach(id => drawPlane(map, id));

  // connectors (in clear channels, never under a card)
  const fg = svg('g', {});
  const yMid = PIPE_Y + CH / 2;
  // forward pipeline horizontals
  [['L1', 'L4'], ['L4', 'L2'], ['L2', 'L5'], ['L5', 'L6']].forEach(([a, b]) =>
    fg.appendChild(line(LAYOUT[a].x + CW, yMid, LAYOUT[b].x, yMid, 'flow fwd')));
  // branch verticals (forward down + return up, offset so both read)
  [['L4', 'L7'], ['L2', 'L3'], ['L5', 'L8']].forEach(([a, b]) => {
    const x = cx(a);
    fg.appendChild(line(x - 6, PIPE_Y + CH, x - 6, BR_Y, 'flow fwd v'));
    fg.appendChild(line(x + 6, BR_Y, x + 6, PIPE_Y + CH, 'flow data v'));
  });
  // egress / response arc L6 -> L1 over the top
  fg.appendChild(svg('path', { d: `M${cx('L6')},${PIPE_Y} C${cx('L6')},58 ${cx('L1')},58 ${cx('L1')},${PIPE_Y}`, class: 'flow data arc' }));
  map.appendChild(fg);
  // egress label
  map.appendChild(svg('text', { x: (cx('L1') + cx('L6')) / 2, y: 52, 'text-anchor': 'middle', class: 'flow-label' }, [txt('response / egress channel (a documented exfiltration path)')]));

  // TB chips and short boundary ticks
  TBCHIPS.forEach(tb => { map.appendChild(tbChip(tb)); if (tb.x > 30) map.appendChild(line(tb.x, PIPE_Y - 6, tb.x, PIPE_Y + CH + 6, 'tb-line')); });
  map.appendChild(line(20, PIPE_Y - 6, 20, PIPE_Y + CH + 6, 'tb-line'));
  // TB2 chip on the L2->L3 model link
  const tb2 = tbChip({ x: cx('L2') + 34, t: 'TB2', full: 'Model / context-window boundary' }, PIPE_Y + CH + 8);
  map.appendChild(tb2);

  // cards on top
  ['L1', 'L4', 'L2', 'L5', 'L6', 'L7', 'L3', 'L8'].forEach(id => drawCard(map, id));
  ['L9', 'L10', 'L11'].forEach(id => labelPlane(map, id));
}

function tbChip(tb, y) {
  const g = svg('g', { class: 'tb-chip' });
  const w = 34, h = 18, x = tb.x - w / 2; const yy = (y == null ? 96 : y);
  g.appendChild(svg('rect', { x, y: yy, width: w, height: h, rx: 9 }));
  g.appendChild(svg('text', { x: tb.x, y: yy + 13, 'text-anchor': 'middle' }, [txt(tb.t)]));
  g.appendChild(svg('title', {}, [txt(tb.full)]));
  return g;
}

function drawCard(map, id) {
  const L = LAYOUT[id];
  const { sev, n } = layerSeverity(id);
  const g = svg('g', { class: 'layer-card', 'data-layer': id, tabindex: '0', role: 'button', 'aria-label': SHORT[id] });
  g.appendChild(svg('rect', { x: L.x + 3, y: L.y + 5, width: L.w, height: L.h, rx: 12, fill: '#03060b', opacity: '0.55' }));
  g.appendChild(svg('rect', { class: 'body', x: L.x, y: L.y, width: L.w, height: L.h, rx: 12, fill: 'url(#cardgrad)', stroke: '#2a3a55', 'stroke-width': 1.2 }));
  g.appendChild(svg('rect', { x: L.x + 1, y: L.y + 1, width: L.w - 2, height: L.h * 0.5, rx: 11, fill: 'url(#sheen)' }));
  g.appendChild(svg('rect', { x: L.x, y: L.y + 9, width: 3.5, height: L.h - 18, rx: 2, fill: SEVC[sev] }));
  g.appendChild(svg('text', { class: 'lid', x: L.x + 15, y: L.y + 24 }, [txt(id)]));
  const w = 30, bx = L.x + L.w - w - 11, by = L.y + 11;
  g.appendChild(svg('rect', { x: bx, y: by, width: w, height: 18, rx: 9, fill: 'rgba(0,0,0,.4)', stroke: SEVC[sev], 'stroke-width': 1.2 }));
  g.appendChild(svg('text', { class: 'rc', x: bx + w / 2, y: by + 13, 'text-anchor': 'middle', fill: SEVC[sev] }, [txt(String(n))]));
  wrapText(g, SHORT[id], L.x + 15, L.y + (L.h > 90 ? 50 : 48), L.w - 24, 14, 'lname', 3);
  g.addEventListener('click', () => openLayer(id));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayer(id); } });
  map.appendChild(g);
}

function drawPlane(map, id) {
  const L = LAYOUT[id];
  const g = svg('g', { class: 'plane layer-card', 'data-layer': id, tabindex: '0', role: 'button', 'aria-label': SHORT[id] });
  g.appendChild(svg('rect', { x: L.x + 2, y: L.y + 4, width: L.w, height: L.h, rx: 11, fill: '#03060b', opacity: '0.5' }));
  g.appendChild(svg('rect', { class: 'body', x: L.x, y: L.y, width: L.w, height: L.h, rx: 11, fill: 'url(#planegrad)', stroke: '#243349', 'stroke-width': 1.1 }));
  g.appendChild(svg('rect', { x: L.x + 1, y: L.y + 1, width: L.w - 2, height: L.h * 0.45, rx: 10, fill: 'url(#sheen)' }));
  g.addEventListener('click', () => openLayer(id));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayer(id); } });
  map.appendChild(g);
}

function labelPlane(map, id) {
  const L = LAYOUT[id];
  const { sev, n } = layerSeverity(id);
  const tag = { L9: 'TB4 identity boundary', L10: 'TB7 control plane: out-of-band, highest trust', L11: 'TB6 provenance boundary' }[id];
  const g = map.querySelector(`g.plane[data-layer="${id}"]`);
  g.appendChild(svg('rect', { x: L.x, y: L.y + 8, width: 3.5, height: L.h - 16, rx: 2, fill: SEVC[sev] }));
  g.appendChild(svg('text', { class: 'lid', x: L.x + 18, y: L.y + 21 }, [txt(id)]));
  g.appendChild(svg('text', { x: L.x + 52, y: L.y + 21, style: 'fill:#eaeef6;font-family:var(--font-ui);font-size:14px;font-weight:600' }, [txt(SHORT[id])]));
  g.appendChild(svg('text', { class: 'plane-label-tag', x: L.x + 52, y: L.y + 38 }, [txt(tag)]));
  const bw = 150, bx = L.x + L.w - bw - 14;
  g.appendChild(svg('rect', { x: bx, y: L.y + 14, width: bw, height: 22, rx: 11, fill: 'rgba(0,0,0,.35)', stroke: SEVC[sev], 'stroke-width': 1.1 }));
  g.appendChild(svg('text', { x: bx + bw / 2, y: L.y + 29, 'text-anchor': 'middle', class: 'rc', fill: SEVC[sev] }, [txt(n + ' risks on this plane')]));
}

function wrapText(g, str, x, y, maxw, fs, cls, maxlines) {
  const words = (str || '').split(' '); let line = '', lines = []; const cpl = Math.max(8, Math.floor(maxw / (fs * 0.54)));
  words.forEach(w => { if ((line + ' ' + w).trim().length > cpl) { lines.push(line.trim()); line = w; } else line += ' ' + w; });
  if (line.trim()) lines.push(line.trim());
  lines = lines.slice(0, maxlines);
  lines.forEach((ln, i) => g.appendChild(svg('text', { class: cls, x, y: y + i * (fs + 3) }, [txt(ln)])));
}

/* ---------------- mobile stacked diagram ---------------- */
function buildMobile() {
  const wrap = $('#mapmobile'); if (!wrap) return;
  wrap.innerHTML = '';
  const groups = [
    { label: 'The request path', ids: ['L1', 'L4', 'L2', 'L3', 'L5', 'L6'] },
    { label: 'Memory & mesh', ids: ['L7', 'L8'] },
    { label: 'Cross-cutting control & supply planes', ids: ['L9', 'L10', 'L11'] },
  ];
  groups.forEach((grp, gi) => {
    wrap.appendChild(el('div', { class: 'mgroup-label' }, esc(grp.label)));
    grp.ids.forEach((id, idx) => {
      const a = DATA.architecture.layers.find(x => x.id === id) || {};
      const { sev, n } = layerSeverity(id);
      const c = el('div', { class: 'mlayer', 'data-layer': id, role: 'button', tabindex: '0' });
      c.style.setProperty('--sev', SEVC[sev]);
      c.innerHTML = `<span class="mstripe"></span>
        <div class="mtop"><span class="mid">${id}</span><span class="mbadge" style="color:${SEVC[sev]};border-color:${SEVC[sev]}">${n} risks</span></div>
        <div class="mname">${esc(SHORT[id])}</div>
        <div class="msum">${esc((a.trust_boundary || '').split('(')[0].trim())}</div>`;
      c.addEventListener('click', () => openLayer(id));
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayer(id); } });
      wrap.appendChild(c);
      const last = (gi === groups.length - 1) && (idx === grp.ids.length - 1);
      if (!last && !(idx === grp.ids.length - 1)) wrap.appendChild(el('div', { class: 'mconn' }));
    });
  });
}

/* ---------------- drawer ---------------- */
const mask = $('#mask'), drawer = $('#drawer');
function closeDrawer() { drawer.classList.remove('open'); mask.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.querySelectorAll('.layer-card.active,.mlayer.active').forEach(n => n.classList.remove('active')); }
$('#dclose').addEventListener('click', closeDrawer);
mask.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

function openLayer(id) {
  const a = DATA.architecture.layers.find(x => x.id === id) || {};
  const ds = DATA.diagram.layers.find(x => x.id === id) || {};
  document.querySelectorAll('.layer-card.active,.mlayer.active').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-layer="${id}"]`).forEach(n => n.classList.add('active'));
  $('#dlid').textContent = id + '  ·  ' + (a.trust_boundary || '');
  $('#dname').textContent = SHORT[id] || a.name;
  $('#dsum').textContent = (ds.summary || a.description || '').replace(/\s+/g, ' ').trim();
  const body = $('#dbody'); body.innerHTML = '';
  if (ds.surfaces && ds.surfaces.length) {
    body.appendChild(secLabel('Attack surfaces'));
    const wrap = el('div');
    ds.surfaces.forEach(s => {
      const chip = el('button', { class: 'surf-tag surf-click', type: 'button', 'aria-label': 'Details: ' + s.label });
      chip.innerHTML = esc(s.label) + ' <span class="surf-i" aria-hidden="true">i</span>';
      chip.addEventListener('click', ev => { ev.stopPropagation(); openSurface(s, SHORT[id] || (a.name || '')); });
      wrap.appendChild(chip);
    });
    body.appendChild(wrap);
  }
  const rs = (RISKS_BY_LAYER[id] || []).slice().sort((x, y) => (sev_rank[y.severity] - sev_rank[x.severity]));
  body.appendChild(secLabel(`Risks on this layer (${rs.length})`));
  rs.forEach(r => body.appendChild(riskAccordion(r)));
  openPanel();
}
function secLabel(t) { const h = el('h5', {}, esc(t)); h.style.cssText = 'font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-size:11px;color:var(--cy);margin:20px 0 8px'; return h; }

/* ---- attack-surface popover (tap-friendly, works on mobile) ---- */
let surfMask, surfCard;
function ensureSurfDom() {
  if (surfMask) return;
  surfMask = el('div', { class: 'surf-mask' });
  surfCard = el('div', { class: 'surf-pop', role: 'dialog', 'aria-modal': 'true' });
  surfMask.appendChild(surfCard);
  document.body.appendChild(surfMask);
  surfMask.addEventListener('click', e => { if (e.target === surfMask) closeSurface(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && surfMask.classList.contains('open')) { e.stopPropagation(); closeSurface(); } });
}
function closeSurface() { if (surfMask) surfMask.classList.remove('open'); }
function openSurface(s, layerName) {
  ensureSurfDom();
  const rs = (s.risk_ids || []).map(id => RISK_BY_ID[id]).filter(Boolean).sort((x, y) => sev_rank[y.severity] - sev_rank[x.severity]);
  let html = `<button class="surf-x" aria-label="Close">&times;</button>
    <div class="surf-kicker">Attack surface &middot; ${esc(layerName)}</div>
    <h4 class="surf-title">${esc(s.label)}</h4>
    <p class="surf-desc">This is where the agent is exposed at this layer. It becomes exploitable through the ${rs.length} risk${rs.length === 1 ? '' : 's'} below. Open any one for its mechanism, a validated real-world example, and the controls that help.</p>`;
  if (rs.length) html += '<div class="surf-risks">' + rs.map(r => `
      <button class="surf-risk" data-r="${r.id}">
        <span class="srtop"><span class="chip sev-${r.severity}">${r.severity}</span><span class="sr-id">${r.id}</span><span class="gap gap-${gapKey(r.gap_status)}">${esc(shortGap(r.gap_status))}</span></span>
        <span class="sr-name">${esc(r.name)}</span>
        <span class="sr-def">${esc(r.short_def)}</span>
      </button>`).join('') + '</div>';
  surfCard.innerHTML = html;
  surfCard.querySelector('.surf-x').addEventListener('click', closeSurface);
  surfCard.querySelectorAll('.surf-risk').forEach(b => b.addEventListener('click', () => { closeSurface(); openRisk(b.dataset.r); }));
  surfCard.scrollTop = 0;
  surfMask.classList.add('open');
}
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
let SEARCH = '', SORT = 'severity';
function normUrl(u) { return (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 80); }
function uniqueIncidents() {
  const seen = new Map();
  DATA.risks.forEach(r => (r.primary_examples || []).forEach(ex => {
    const k = normUrl(ex.url || ex.title); if (k && !seen.has(k)) seen.set(k, ex);
  }));
  return [...seen.values()];
}
function sortRisks(rs, key) {
  const a = rs.slice();
  const num = (x, y) => x.id.localeCompare(y.id, undefined, { numeric: true });
  if (key === 'severity') a.sort((x, y) => (sev_rank[y.severity] - sev_rank[x.severity]) || num(x, y));
  else if (key === 'id') a.sort(num);
  else if (key === 'family') a.sort((x, y) => x.family_id.localeCompare(y.family_id) || num(x, y));
  else if (key === 'gap') { const o = { Open: 0, Under: 1, Partially: 2, Well: 3 }; a.sort((x, y) => (o[gapKey(x.gap_status)] - o[gapKey(y.gap_status)]) || (sev_rank[y.severity] - sev_rank[x.severity])); }
  return a;
}
function buildExplorer() {
  const fbar = $('#filters');
  const fams = [['all', 'All families']].concat(DATA.families.map(f => [f.id, f.name.replace(/ &.*/, '')]));
  const sevs = [['all', 'All'], ['Critical', 'Critical'], ['High', 'High'], ['Medium', 'Medium']];
  const gaps = [['all', 'All'], ['Open', 'Open problem'], ['Under', 'Under-served'], ['Partially', 'Partially-addressed'], ['Well', 'Well-addressed']];
  fbar.appendChild(groupFilters('family', fams));
  fbar.appendChild(el('span', { style: 'flex-basis:100%;height:0' }));
  fbar.appendChild(groupFilters('severity', sevs, 'Severity'));
  fbar.appendChild(groupFilters('gap', gaps, 'Coverage'));
  const si = $('#search'); if (si) si.addEventListener('input', e => { SEARCH = e.target.value; renderGrid(); });
  const so = $('#sort'); if (so) so.addEventListener('change', e => { SORT = e.target.value; renderGrid(); });
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
  const q = SEARCH.trim().toLowerCase();
  let rs = DATA.risks.filter(r =>
    (FILT.family === 'all' || r.family_id === FILT.family) &&
    (FILT.severity === 'all' || r.severity === FILT.severity) &&
    (FILT.gap === 'all' || gapKey(r.gap_status) === FILT.gap) &&
    (!q || (r.id + ' ' + r.name + ' ' + r.short_def + ' ' + (r.mechanism || '') + ' ' + (r.family_name || '') + ' ' + (r.layers || []).join(' ') + ' ' + (r.primary_examples || []).map(e => e.title).join(' ')).toLowerCase().includes(q)));
  rs = sortRisks(rs, SORT);
  const rc = $('#resultcount'); if (rc) rc.textContent = rs.length + ' of ' + DATA.risks.length + ' risks';
  if (!rs.length) { grid.appendChild(el('p', { style: 'color:var(--fg-mute)' }, 'No risks match. Try clearing a filter or the search.')); return; }
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

/* ---------------- incident index ---------------- */
function buildIncidentIndex() {
  const t = $('#inctable'); if (!t) return;
  const incs = uniqueIncidents();
  const byUrl = {};
  DATA.risks.forEach(r => (r.primary_examples || []).forEach(ex => { const k = normUrl(ex.url || ex.title); (byUrl[k] = byUrl[k] || new Set()).add(r.id); }));
  incs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  t.innerHTML = `<thead><tr><th>Incident</th><th>Agent / product</th><th>Date</th><th>Demonstrates</th></tr></thead>`;
  const tb = el('tbody');
  incs.forEach(ex => {
    const rids = [...(byUrl[normUrl(ex.url || ex.title)] || [])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const tr = el('tr');
    tr.innerHTML = `<td class="rname"><a href="${encodeURI(ex.url || '#')}" target="_blank" rel="noopener">${esc(ex.title)}</a></td>
      <td style="font-size:12.5px;color:var(--fg-soft)">${esc(ex.agent || '')}</td>
      <td class="rid">${esc(ex.date || '')}</td>
      <td class="rid" style="font-size:11px">${rids.join(' ')}</td>`;
    tr.dataset.s = ((ex.title || '') + ' ' + (ex.agent || '') + ' ' + (ex.date || '') + ' ' + rids.join(' ')).toLowerCase();
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  const cnt = $('#inccount'); if (cnt) cnt.textContent = incs.length + ' verified incidents';
  const si = $('#incsearch');
  if (si) si.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); let n = 0;
    tb.querySelectorAll('tr').forEach(r => { const m = !q || r.dataset.s.includes(q); r.style.display = m ? '' : 'none'; if (m) n++; });
    if (cnt) cnt.textContent = (q ? n + ' of ' + incs.length : incs.length) + ' verified incidents';
  });
}
function setHeroStats() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('st-risks', DATA.risks.length);
  set('st-incidents', uniqueIncidents().length);
  set('st-gaps', DATA.risks.filter(r => ['Open', 'Under'].includes(gapKey(r.gap_status))).length);
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
    if (window.matchMedia('(max-width:760px)').matches) return;
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
  }, { threshold: 0.06 });
  targets.forEach(t => { t.classList.add('ros'); io.observe(t); });
}

/* ---------------- boot ---------------- */
fetch('assets/data.json').then(r => r.json()).then(d => {
  DATA = d;
  RISK_BY_ID = {}; d.risks.forEach(r => RISK_BY_ID[r.id] = r);
  RISKS_BY_LAYER = {};
  d.risks.forEach(r => (r.layers || []).forEach(l => { (RISKS_BY_LAYER[l] = RISKS_BY_LAYER[l] || []).push(r); }));
  setHeroStats();
  buildMap(); buildMobile(); buildExplorer(); buildMapping(); buildRecs(); buildIncidentIndex();
  document.querySelectorAll('.dl').forEach(attachTilt);
  document.querySelectorAll('.stat').forEach(attachGlow);
  initReveal();
}).catch(e => { console.error(e); $('#mapwrap').innerHTML = '<p style="color:var(--crit);padding:30px">Failed to load data.json: ' + esc(String(e)) + '</p>'; });
