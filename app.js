/* =========================================================
   Elnea Kingdom — Family & Relationship Trees
   Single-page app, data in localStorage, no dependencies.
   ========================================================= */

const STORE_KEY = 'elnea.familytree.v1';

/* ---------- Occupations (edit freely) ---------- */
const OCCUPATIONS = {
  'Royalty & Court': ['King','Queen','Prince','Princess','Noble','Lord','Lady','Chancellor','Minister','Court Mage','Royal Physician','Royal Chef','Royal Guard','Chamberlain','Diplomat'],
  'Knights & Military': ['Knight','Knight Captain','Squire','Soldier','Town Guard','Gatekeeper','Mercenary','Adventurer','Archer','Commander'],
  'Church & Faith': ['Priest','Priestess','Bishop','Monk','Nun','Acolyte','Missionary','Gravekeeper','Oracle'],
  'Magic & Medicine': ['Mage','Sorcerer','Witch','Alchemist','Doctor','Apothecary','Pharmacist','Herbalist','Fortune Teller','Enchanter'],
  'Crafting': ['Blacksmith','Weaponsmith','Armorer','Carpenter','Mason','Tailor','Seamstress','Shoemaker','Jeweler','Accessory Maker','Glassblower','Potter','Woodcarver','Toymaker'],
  'Food & Hospitality': ['Chef','Cook','Baker','Confectioner','Bartender','Waiter','Innkeeper','Tavern Owner','Brewer'],
  'Trade & Commerce': ['Merchant','Shopkeeper','Peddler','Trader','Banker','Appraiser','Auctioneer','Tax Collector'],
  'Farming & Nature': ['Farmer','Rancher','Fisherman','Hunter','Miner','Lumberjack','Gardener','Florist','Beekeeper','Stablehand','Beast Tamer'],
  'Arts & Letters': ['Bard','Musician','Dancer','Actor','Painter','Sculptor','Writer','Poet','Scholar','Teacher','Librarian','Scribe','Cartographer'],
  'Household & Service': ['Maid','Butler','Servant','Nanny','Courier','Messenger','Laundress','Cleaner','Homemaker'],
  'Outlaw & Other': ['Thief','Bandit','Smuggler','Assassin','Pirate','Beggar','Wanderer','Student','Child','Unemployed','Retired','Unknown']
};

/* ---------- Relationship types ---------- */
const LINK_TYPES = {
  parent:       { label:'Parent → Child',            family:true,  directed:true,  roles:['Parent of','Child of'],              color:'#7aa2f7', dash:null },
  adopted:      { label:'Adoptive parent → Child',   family:true,  directed:true,  roles:['Adoptive parent of','Adopted by'],   color:'#9db4d8', dash:'5 4' },
  spouse:       { label:'Spouse / Partner',           family:true,  directed:false, roles:['Spouse of','Spouse of'],             color:'#f28b82', dash:null },
  sibling:      { label:'Sibling (manual)',           family:true,  directed:false, roles:['Sibling of','Sibling of'],           color:'#90a4ae', dash:null },

  betrothed:    { label:'Betrothed',                  family:false, directed:false, roles:['Betrothed to','Betrothed to'],       color:'#ffab91', dash:'2 4' },
  ex:           { label:'Previous relationship',      family:false, directed:false, roles:['Ex-partner of','Ex-partner of'],     color:'#f6a6c1', dash:'7 5' },
  bestfriend:   { label:'Best friend',                family:false, directed:false, roles:['Best friend of','Best friend of'],   color:'#34d399', dash:null },
  friend:       { label:'Friend',                     family:false, directed:false, roles:['Friend of','Friend of'],             color:'#81c995', dash:'6 4' },
  ally:         { label:'Ally',                       family:false, directed:false, roles:['Ally of','Ally of'],                 color:'#4db6ac', dash:'6 4' },
  acquaintance: { label:'Acquaintance',               family:false, directed:false, roles:['Knows','Knows'],                     color:'#78909c', dash:'2 5' },
  rival:        { label:'Rival',                      family:false, directed:false, roles:['Rival of','Rival of'],               color:'#fbbc04', dash:'8 4' },
  enemy:        { label:'Enemy',                      family:false, directed:false, roles:['Enemy of','Enemy of'],               color:'#ef5350', dash:'8 4' },
  guardian:     { label:'Guardian → Ward',            family:false, directed:true,  roles:['Guardian of','Ward of'],             color:'#a78bfa', dash:null },
  mentor:       { label:'Mentor → Apprentice',        family:false, directed:true,  roles:['Mentor of','Apprentice of'],         color:'#4dd0e1', dash:'5 3' }
};
const FAMILY_TYPES = Object.keys(LINK_TYPES).filter(k => LINK_TYPES[k].family);
const SOCIAL_TYPES = Object.keys(LINK_TYPES).filter(k => !LINK_TYPES[k].family);
const TREE_COLORS = ['#7aa2f7','#f28b82','#81c995','#fbbc04','#a78bfa','#4dd0e1','#ff8a65','#c3a6ff'];

/* ---------- Geometry ---------- */
const NW = 210, NH = 78, HGAP = 44, VGAP = 110, COUPLE_GAP = 26, TREE_GAP = 140;

/* ---------- State ---------- */
let state = load() || seed();
let ui = {
  view: 'family',
  treeFilter: 'all',
  search: '',
  occFilter: 'all',
  show: new Set([...FAMILY_TYPES, ...SOCIAL_TYPES]),
  selected: null,
  editing: null,
  draft: null,
  zoom: 1, panX: 0, panY: 0
};

function uid(p){ return p + Math.random().toString(36).slice(2, 9); }

function seed(){
  const t1 = { id: uid('t'), name: 'Main Family' };
  const t2 = { id: uid('t'), name: 'Neighbours' };
  const c = (name, tree, gender, occ, extra) => Object.assign({
    id: uid('c'), treeId: tree, name, gender, occupation: occ, title: '',
    status: 'alive', born: '', died: '', notes: '', images: [], portrait: 0
  }, extra || {});
  const dad = c('Rowan', t1.id, 'male', 'Blacksmith');
  const mum = c('Elira', t1.id, 'female', 'Herbalist');
  const kid = c('Sera', t1.id, 'female', 'Adventurer');
  const pal = c('Tomas', t2.id, 'male', 'Baker');
  return {
    version: 1,
    trees: [t1, t2],
    characters: [dad, mum, kid, pal],
    links: [
      { id: uid('l'), type: 'spouse', from: dad.id, to: mum.id },
      { id: uid('l'), type: 'parent', from: dad.id, to: kid.id },
      { id: uid('l'), type: 'parent', from: mum.id, to: kid.id },
      { id: uid('l'), type: 'friend', from: kid.id, to: pal.id }
    ],
    positions: { family: {}, social: {} }
  };
}

function load(){
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}
function save(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch(e){ toast('Browser storage is full — export your data or remove some pictures.'); }
}

/* ---------- Helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const byId = id => state.characters.find(c => c.id === id);
const treeById = id => state.trees.find(t => t.id === id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
function treeColor(treeId){ return TREE_COLORS[Math.max(0, state.trees.findIndex(t => t.id === treeId)) % TREE_COLORS.length]; }
function portraitOf(c){ return (c.images && c.images.length) ? c.images[Math.min(c.portrait || 0, c.images.length - 1)] : null; }

let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3200);
}

/* =========================================================
   Sidebar
   ========================================================= */
function renderTreeControls(){
  const sel = $('#treeFilter');
  sel.innerHTML = `<option value="all">All trees (${state.trees.length})</option>` +
    state.trees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  sel.value = ui.treeFilter;

  $('#treeList').innerHTML = state.trees.map(t => {
    const n = state.characters.filter(c => c.treeId === t.id).length;
    return `<li data-tree="${t.id}">
      <span class="dot" style="background:${treeColor(t.id)}"></span>
      <span class="nm">${esc(t.name)}</span>
      <span class="cnt">${n}</span>
      <button class="btn small" data-rename="${t.id}">rename</button>
      <button class="btn small" data-deltree="${t.id}">del</button>
    </li>`;
  }).join('');
}

function renderOccFilter(){
  const sel = $('#occFilter');
  sel.innerHTML = `<option value="all">All occupations</option>` + occOptionsHtml();
  sel.value = ui.occFilter;
}
function occOptionsHtml(selected){
  return Object.entries(OCCUPATIONS).map(([grp, list]) =>
    `<optgroup label="${esc(grp)}">` +
    list.map(o => `<option value="${esc(o)}"${o === selected ? ' selected' : ''}>${esc(o)}</option>`).join('') +
    `</optgroup>`).join('');
}

function visibleCharacters(){
  return state.characters.filter(c => {
    if (ui.treeFilter !== 'all' && c.treeId !== ui.treeFilter) return false;
    if (ui.occFilter !== 'all' && c.occupation !== ui.occFilter) return false;
    if (ui.search){
      const hay = `${c.name} ${c.title} ${c.occupation} ${c.notes}`.toLowerCase();
      if (!hay.includes(ui.search.toLowerCase())) return false;
    }
    return true;
  });
}

function renderCharList(){
  const list = visibleCharacters().slice().sort((a, b) => a.name.localeCompare(b.name));
  $('#charList').innerHTML = list.length ? list.map(c => {
    const img = portraitOf(c);
    const tn = treeById(c.treeId);
    return `<li data-char="${c.id}" class="${ui.selected === c.id ? 'sel' : ''}">
      ${img ? `<img class="thumb" src="${img}">` : `<span class="thumb"></span>`}
      <span class="meta"><b>${esc(c.name)}</b><span>${esc(c.occupation || '—')} &middot; ${esc(tn ? tn.name : '')}</span></span>
    </li>`;
  }).join('') : `<li class="muted">No characters match.</li>`;
}

function renderTypeFilters(){
  const row = k => {
    const t = LINK_TYPES[k];
    return `<label><input type="checkbox" data-type="${k}" ${ui.show.has(k) ? 'checked' : ''}>
      <span class="swatch" style="background:${t.color}"></span>${esc(t.label)}</label>`;
  };
  $('#typeFilters').innerHTML =
    `<div class="sep">Family</div>` + FAMILY_TYPES.map(row).join('') +
    `<div class="sep">Social</div>` + SOCIAL_TYPES.map(row).join('');
}

/* =========================================================
   Layout
   ========================================================= */
function activeLinks(chars){
  const ids = new Set(chars.map(c => c.id));
  return state.links.filter(l => ids.has(l.from) && ids.has(l.to) && ui.show.has(l.type));
}

/* Family layout: generations + barycenter ordering, per tree, trees side by side */
function layoutFamily(chars){
  const pos = {};
  const groups = ui.treeFilter === 'all'
    ? state.trees.map(t => chars.filter(c => c.treeId === t.id)).filter(g => g.length)
    : [chars];
  let offsetX = 0;
  const frames = [];

  groups.forEach(group => {
    const ids = new Set(group.map(c => c.id));
    const fam = state.links.filter(l => LINK_TYPES[l.type].family && ids.has(l.from) && ids.has(l.to));
    const parentsOf = {}, childrenOf = {}, spouses = {};
    group.forEach(c => { parentsOf[c.id] = []; childrenOf[c.id] = []; spouses[c.id] = []; });
    fam.forEach(l => {
      if (l.type === 'parent' || l.type === 'adopted'){
        parentsOf[l.to].push(l.from); childrenOf[l.from].push(l.to);
      } else if (l.type === 'spouse'){
        spouses[l.from].push(l.to); spouses[l.to].push(l.from);
      }
    });

    // generations
    const gen = {}; group.forEach(c => gen[c.id] = 0);
    for (let i = 0; i < group.length + 4; i++){
      let moved = false;
      fam.forEach(l => {
        if (l.type === 'parent' || l.type === 'adopted'){
          if (gen[l.to] < gen[l.from] + 1){ gen[l.to] = gen[l.from] + 1; moved = true; }
        }
      });
      group.forEach(c => spouses[c.id].forEach(s => {
        const m = Math.max(gen[c.id], gen[s]);
        if (gen[c.id] !== m || gen[s] !== m){ gen[c.id] = gen[s] = m; moved = true; }
      }));
      if (!moved) break;
    }

    // couple units
    const seen = new Set(), units = [];
    group.forEach(c => {
      if (seen.has(c.id)) return;
      const unit = [c.id]; seen.add(c.id);
      spouses[c.id].forEach(s => { if (!seen.has(s) && gen[s] === gen[c.id]){ unit.push(s); seen.add(s); } });
      units.push({ ids: unit, gen: gen[c.id] });
    });

    // rows
    const rows = {};
    units.forEach(u => (rows[u.gen] = rows[u.gen] || []).push(u));
    const gens = Object.keys(rows).map(Number).sort((a, b) => a - b);

    const xOf = {};
    const place = () => gens.forEach(g => {
      let x = 0;
      rows[g].forEach(u => {
        u.x = x;
        u.ids.forEach((id, i) => xOf[id] = x + i * (NW + COUPLE_GAP));
        x += u.ids.length * NW + (u.ids.length - 1) * COUPLE_GAP + HGAP;
      });
      rows[g].width = x - HGAP;
    });
    place();

    // barycenter passes: pull children under parents
    for (let pass = 0; pass < 6; pass++){
      gens.forEach(g => {
        if (g === gens[0]) return;
        rows[g].forEach(u => {
          const ps = [];
          u.ids.forEach(id => parentsOf[id].forEach(p => { if (xOf[p] != null) ps.push(xOf[p]); }));
          u.key = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : u.x;
        });
        rows[g].sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
      });
      place();
    }

    const maxW = Math.max(...gens.map(g => rows[g].width || 0), NW);
    gens.forEach(g => {
      const shift = (maxW - (rows[g].width || 0)) / 2;
      rows[g].forEach(u => u.ids.forEach(id => xOf[id] += shift));
    });

    group.forEach(c => {
      pos[c.id] = { x: offsetX + (xOf[c.id] || 0), y: gen[c.id] * (NH + VGAP) };
    });
    const t = treeById(group[0].treeId);
    frames.push({
      x: offsetX - 26, y: -56, w: maxW + 52,
      h: (Math.max(...gens) + 1) * (NH + VGAP) - VGAP + 82,
      name: t ? t.name : '', color: treeColor(group[0].treeId)
    });
    offsetX += maxW + TREE_GAP;
  });

  return { pos, frames };
}

/* Social layout: one ring per tree, rings laid out in a grid */
function layoutSocial(chars){
  const pos = {}, frames = [];
  const groups = ui.treeFilter === 'all'
    ? state.trees.map(t => chars.filter(c => c.treeId === t.id)).filter(g => g.length)
    : [chars];
  const perRow = Math.ceil(Math.sqrt(groups.length));
  let cellW = 0, cellH = 0;
  const radii = groups.map(g => Math.max(220, (g.length * (NW + 40)) / (2 * Math.PI)));
  radii.forEach(r => { cellW = Math.max(cellW, 2 * r + NW + 120); cellH = Math.max(cellH, 2 * r + NH + 160); });

  groups.forEach((group, gi) => {
    const cx = (gi % perRow) * cellW + cellW / 2;
    const cy = Math.floor(gi / perRow) * cellH + cellH / 2;
    const r = radii[gi];
    group.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((c, i) => {
      const a = (i / group.length) * Math.PI * 2 - Math.PI / 2;
      pos[c.id] = { x: cx + r * Math.cos(a) - NW / 2, y: cy + r * Math.sin(a) - NH / 2 };
    });
    const t = treeById(group[0].treeId);
    frames.push({
      x: cx - r - NW / 2 - 30, y: cy - r - NH / 2 - 60,
      w: 2 * r + NW + 60, h: 2 * r + NH + 90,
      name: t ? t.name : '', color: treeColor(group[0].treeId)
    });
  });
  return { pos, frames };
}

function computeLayout(){
  const chars = visibleCharacters();
  const mode = ui.view === 'social' ? 'social' : 'family';
  const base = mode === 'social' ? layoutSocial(chars) : layoutFamily(chars);
  const manual = state.positions[mode] || {};
  const pos = {};
  chars.forEach(c => {
    pos[c.id] = manual[c.id] ? { ...manual[c.id] } : (base.pos[c.id] || { x: 0, y: 0 });
  });
  return { chars, pos, frames: base.frames, mode };
}

/* =========================================================
   Drawing
   ========================================================= */
let lastLayout = null;

function renderGraph(){
  const L = lastLayout = computeLayout();
  const { chars, pos } = L;
  const links = activeLinks(chars).filter(l => {
    if (ui.view === 'family') return LINK_TYPES[l.type].family;
    if (ui.view === 'social') return !LINK_TYPES[l.type].family;
    return true;
  });

  const sel = ui.selected;
  const near = new Set();
  if (sel){ near.add(sel); links.forEach(l => { if (l.from === sel) near.add(l.to); if (l.to === sel) near.add(l.from); }); }

  const defs = `<defs>
    <clipPath id="avClip" clipPathUnits="userSpaceOnUse">
      <rect x="9" y="9" width="60" height="60" rx="9"></rect>
    </clipPath>
    ${Object.entries(LINK_TYPES).map(([k, t]) => `
      <marker id="ar_${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="${t.color}"></path>
      </marker>`).join('')}
  </defs>`;

  const framesSvg = L.frames.map(f => `
    <g>
      <rect class="tree-frame" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="18" stroke="${f.color}" opacity=".45"></rect>
      <text class="tree-title" x="${f.x + 14}" y="${f.y + 24}" fill="${f.color}">${esc(f.name)}</text>
    </g>`).join('');

  const edgesSvg = links.map(l => {
    const a = pos[l.from], b = pos[l.to], t = LINK_TYPES[l.type];
    if (!a || !b) return '';
    const dim = sel && !(near.has(l.from) && near.has(l.to));
    let d;
    if ((l.type === 'parent' || l.type === 'adopted') && L.mode === 'family' && b.y > a.y){
      const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y, my = y1 + (y2 - y1) / 2;
      d = `M${x1},${y1} V${my} H${x2} V${y2}`;
    } else {
      const c1 = { x: a.x + NW / 2, y: a.y + NH / 2 }, c2 = { x: b.x + NW / 2, y: b.y + NH / 2 };
      const mx = (c1.x + c2.x) / 2, my = (c1.y + c2.y) / 2;
      const dx = c2.x - c1.x, dy = c2.y - c1.y, len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(90, len * 0.18);
      d = `M${c1.x},${c1.y} Q${mx - (dy / len) * bow},${my + (dx / len) * bow} ${c2.x},${c2.y}`;
    }
    return `<path class="edge ${dim ? 'dim' : ''}" d="${d}" stroke="${t.color}"
      ${t.dash ? `stroke-dasharray="${t.dash}"` : ''}
      ${t.directed ? `marker-end="url(#ar_${l.type})"` : ''}></path>`;
  }).join('');

  const nodesSvg = chars.map(c => {
    const p = pos[c.id]; const img = portraitOf(c);
    const dim = sel && !near.has(c.id);
    const accent = treeColor(c.treeId);
    const years = [c.born, c.died].filter(Boolean).join(' – ');
    const sub = [c.title, years, c.status === 'deceased' ? '†' : ''].filter(Boolean).join(' · ');
    return `<g class="node ${ui.selected === c.id ? 'sel' : ''} ${dim ? 'dim' : ''}" data-id="${c.id}" transform="translate(${p.x},${p.y})">
      <rect class="card" width="${NW}" height="${NH}" rx="12"></rect>
      <rect x="0" y="0" width="5" height="${NH}" rx="2" fill="${accent}"></rect>
      ${img
        ? `<image href="${img}" x="9" y="9" width="60" height="60" clip-path="url(#avClip)" preserveAspectRatio="xMidYMid slice"></image>`
        : `<rect x="9" y="9" width="60" height="60" rx="9" fill="#2b3245"></rect>
           <text x="39" y="46" text-anchor="middle" fill="#6f7b96" font-size="20">${esc((c.name || '?').slice(0,1).toUpperCase())}</text>`}
      <text class="nm" x="80" y="30">${esc(trim(c.name, 17))}</text>
      <text class="oc" x="80" y="48">${esc(trim(c.occupation || '—', 20))}</text>
      <text class="ti" x="80" y="64">${esc(trim(sub, 24))}</text>
    </g>`;
  }).join('');

  $('#canvas').innerHTML = defs +
    `<g id="scene" transform="translate(${ui.panX},${ui.panY}) scale(${ui.zoom})">
       ${framesSvg}${edgesSvg}${nodesSvg}
     </g>`;
}
function trim(s, n){ s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function fitView(){
  if (!lastLayout || !lastLayout.chars.length){ ui.zoom = 1; ui.panX = 40; ui.panY = 80; return renderGraph(); }
  const xs = [], ys = [];
  lastLayout.chars.forEach(c => { const p = lastLayout.pos[c.id]; xs.push(p.x, p.x + NW); ys.push(p.y, p.y + NH); });
  lastLayout.frames.forEach(f => { xs.push(f.x, f.x + f.w); ys.push(f.y, f.y + f.h); });
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const r = $('#canvas').getBoundingClientRect();
  const z = Math.min((r.width - 80) / (maxX - minX || 1), (r.height - 80) / (maxY - minY || 1), 1.4);
  ui.zoom = Math.max(0.12, z);
  ui.panX = (r.width - (maxX - minX) * ui.zoom) / 2 - minX * ui.zoom;
  ui.panY = (r.height - (maxY - minY) * ui.zoom) / 2 - minY * ui.zoom;
  renderGraph();
}

/* =========================================================
   Character modal
   ========================================================= */
function openChar(id){
  ui.editing = id;
  const c = id ? byId(id) : null;
  ui.draft = c ? JSON.parse(JSON.stringify(c)) : {
    id: uid('c'),
    treeId: ui.treeFilter !== 'all' ? ui.treeFilter : (state.trees[0] && state.trees[0].id),
    name: '', gender: 'female', occupation: '', title: '', status: 'alive',
    born: '', died: '', notes: '', images: [], portrait: 0
  };
  $('#charModalTitle').textContent = c ? `Edit — ${c.name}` : 'New character';
  $('#btnDeleteChar').hidden = !c;

  const d = ui.draft;
  $('#f_name').value = d.name; $('#f_title').value = d.title || '';
  $('#f_gender').value = d.gender; $('#f_status').value = d.status || 'alive';
  $('#f_born').value = d.born || ''; $('#f_died').value = d.died || '';
  $('#f_notes').value = d.notes || '';
  $('#f_tree').innerHTML = state.trees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  $('#f_tree').value = d.treeId;
  $('#f_occ').innerHTML = `<option value="">— none —</option>` + occOptionsHtml(d.occupation);
  $('#f_occ').value = d.occupation || '';

  renderGallery(); renderRelEditor(); switchTab('details');
  $('#charModal').hidden = false;
}

function switchTab(name){
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tab-pane').forEach(p => p.hidden = p.dataset.pane !== name);
}

function collectDraft(){
  const d = ui.draft;
  d.name = $('#f_name').value.trim() || 'Unnamed';
  d.title = $('#f_title').value.trim();
  d.treeId = $('#f_tree').value;
  d.gender = $('#f_gender').value;
  d.occupation = $('#f_occ').value;
  d.status = $('#f_status').value;
  d.born = $('#f_born').value.trim();
  d.died = $('#f_died').value.trim();
  d.notes = $('#f_notes').value;
  return d;
}

function renderGallery(){
  const d = ui.draft;
  $('#galleryGrid').innerHTML = (d.images || []).length
    ? d.images.map((src, i) => `
      <div class="gallery-item ${i === d.portrait ? 'main' : ''}">
        ${i === d.portrait ? '<span class="badge">portrait</span>' : ''}
        <img src="${src}">
        <div class="acts">
          <button class="btn small" data-main="${i}">Portrait</button>
          <button class="btn small danger" data-delimg="${i}">Remove</button>
        </div>
      </div>`).join('')
    : `<p class="muted">No pictures yet.</p>`;
}

function renderRelEditor(){
  const d = ui.draft;
  $('#r_type').innerHTML = Object.entries(LINK_TYPES)
    .map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('');
  $('#r_target').innerHTML = state.characters.filter(c => c.id !== d.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => {
      const t = treeById(c.treeId);
      return `<option value="${c.id}">${esc(c.name)} — ${esc(t ? t.name : '')}</option>`;
    }).join('');
  updateDirOptions();

  const mine = state.links.filter(l => l.from === d.id || l.to === d.id);
  $('#relList').innerHTML = mine.length ? mine.map(l => {
    const t = LINK_TYPES[l.type];
    const isFrom = l.from === d.id;
    const other = byId(isFrom ? l.to : l.from);
    const role = isFrom ? t.roles[0] : t.roles[1];
    return `<li>
      <span class="swatch" style="background:${t.color}"></span>
      <span class="txt">${esc(role)} <b>${esc(other ? other.name : '???')}</b>
        <span class="muted">(${esc(t.label)})</span></span>
      <button class="btn small danger" data-dellink="${l.id}">remove</button>
    </li>`;
  }).join('') : `<li class="muted">No relationships yet.</li>`;
}

function updateDirOptions(){
  const k = $('#r_type').value, t = LINK_TYPES[k], dirSel = $('#r_dir');
  if (!t.directed){
    dirSel.innerHTML = `<option value="out">${esc(t.roles[0])} …</option>`;
    dirSel.disabled = true;
  } else {
    dirSel.disabled = false;
    dirSel.innerHTML = `<option value="out">I am ${esc(t.roles[0])} …</option>
                        <option value="in">I am ${esc(t.roles[1])} …</option>`;
  }
}

/* ---------- image resize ---------- */
function readImage(file, max = 512){
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => res(null);
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* =========================================================
   Events
   ========================================================= */
function renderAll(){ renderTreeControls(); renderOccFilter(); renderCharList(); renderTypeFilters(); renderGraph(); }

/* toolbar */
$('#viewMode').addEventListener('change', e => { ui.view = e.target.value; renderGraph(); });
$$('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = b.dataset.preset;
  ui.show = new Set(p === 'family' ? FAMILY_TYPES : p === 'social' ? SOCIAL_TYPES : [...FAMILY_TYPES, ...SOCIAL_TYPES]);
  if (p === 'social' && ui.view === 'family') { ui.view = 'social'; $('#viewMode').value = 'social'; }
  if (p === 'family' && ui.view === 'social') { ui.view = 'family'; $('#viewMode').value = 'family'; }
  renderTypeFilters(); renderGraph();
}));
$('#btnFit').addEventListener('click', fitView);
$('#btnResetPos').addEventListener('click', () => {
  state.positions = { family: {}, social: {} }; save(); renderGraph(); fitView();
});
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `elnea-trees-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
});
$('#btnImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const data = JSON.parse(fr.result);
      if (!data.characters || !data.trees) throw 0;
      data.positions = data.positions || { family:{}, social:{} };
      state = data; ui.treeFilter = 'all'; ui.selected = null;
      save(); renderAll(); fitView(); toast('Imported.');
    } catch(_) { toast('That file is not a valid Elnea export.'); }
  };
  fr.readAsText(f);
  e.target.value = '';
});

/* sidebar */
$('#treeFilter').addEventListener('change', e => { ui.treeFilter = e.target.value; renderCharList(); renderGraph(); fitView(); });
$('#occFilter').addEventListener('change', e => { ui.occFilter = e.target.value; renderCharList(); renderGraph(); });
$('#search').addEventListener('input', e => { ui.search = e.target.value; renderCharList(); renderGraph(); });
$('#btnAddTree').addEventListener('click', () => {
  const name = prompt('Tree name:', 'New Family');
  if (!name) return;
  state.trees.push({ id: uid('t'), name: name.trim() });
  save(); renderAll();
});
$('#treeList').addEventListener('click', e => {
  const rn = e.target.closest('[data-rename]'), dl = e.target.closest('[data-deltree]');
  if (rn){
    const t = treeById(rn.dataset.rename);
    const name = prompt('Rename tree:', t.name);
    if (name){ t.name = name.trim(); save(); renderAll(); }
    return;
  }
  if (dl){
    const t = treeById(dl.dataset.deltree);
    const n = state.characters.filter(c => c.treeId === t.id).length;
    if (!confirm(`Delete "${t.name}" and its ${n} character(s)?`)) return;
    const gone = new Set(state.characters.filter(c => c.treeId === t.id).map(c => c.id));
    state.characters = state.characters.filter(c => !gone.has(c.id));
    state.links = state.links.filter(l => !gone.has(l.from) && !gone.has(l.to));
    state.trees = state.trees.filter(x => x.id !== t.id);
    if (ui.treeFilter === t.id) ui.treeFilter = 'all';
    save(); renderAll();
    return;
  }
  const li = e.target.closest('[data-tree]');
  if (li){ ui.treeFilter = li.dataset.tree; renderAll(); fitView(); }
});
$('#btnAddChar').addEventListener('click', () => {
  if (!state.trees.length){ toast('Create a tree first.'); return; }
  openChar(null);
});
$('#charList').addEventListener('click', e => {
  const li = e.target.closest('[data-char]'); if (!li) return;
  ui.selected = ui.selected === li.dataset.char ? null : li.dataset.char;
  renderCharList(); renderGraph();
});
$('#charList').addEventListener('dblclick', e => {
  const li = e.target.closest('[data-char]'); if (li) openChar(li.dataset.char);
});
$('#typeFilters').addEventListener('change', e => {
  const k = e.target.dataset.type; if (!k) return;
  e.target.checked ? ui.show.add(k) : ui.show.delete(k);
  renderGraph();
});

/* modal */
$$('[data-close]').forEach(b => b.addEventListener('click', () => { $('#' + b.dataset.close).hidden = true; }));
$$('.tab').forEach(t => t.addEventListener('click', () => { collectDraft(); switchTab(t.dataset.tab); }));
$('#btnPickImages').addEventListener('click', () => $('#f_images').click());
$('#f_images').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []);
  for (const f of files){
    const url = await readImage(f);
    if (url) ui.draft.images.push(url);
  }
  e.target.value = ''; renderGallery();
});
$('#galleryGrid').addEventListener('click', e => {
  const m = e.target.closest('[data-main]'), d = e.target.closest('[data-delimg]');
  if (m){ ui.draft.portrait = +m.dataset.main; renderGallery(); }
  if (d){
    const i = +d.dataset.delimg;
    ui.draft.images.splice(i, 1);
    if (ui.draft.portrait >= ui.draft.images.length) ui.draft.portrait = 0;
    renderGallery();
  }
});
$('#r_type').addEventListener('change', updateDirOptions);
$('#btnAddRel').addEventListener('click', () => {
  const d = collectDraft();
  if (!byId(d.id)){ // make sure the character exists before linking
    state.characters.push(JSON.parse(JSON.stringify(d)));
    ui.editing = d.id;
  } else {
    Object.assign(byId(d.id), JSON.parse(JSON.stringify(d)));
  }
  const type = $('#r_type').value, target = $('#r_target').value;
  if (!target){ toast('No other character to link to yet.'); return; }
  const out = $('#r_dir').value === 'out';
  const from = out ? d.id : target, to = out ? target : d.id;
  if (state.links.some(l => l.type === type && l.from === from && l.to === to)){ toast('That link already exists.'); return; }
  state.links.push({ id: uid('l'), type, from, to });
  if (!ui.show.has(type)) ui.show.add(type);
  save(); renderRelEditor(); renderTypeFilters(); renderAll();
});
$('#relList').addEventListener('click', e => {
  const b = e.target.closest('[data-dellink]'); if (!b) return;
  state.links = state.links.filter(l => l.id !== b.dataset.dellink);
  save(); renderRelEditor(); renderGraph();
});
$('#btnSaveChar').addEventListener('click', () => {
  const d = collectDraft();
  const existing = byId(d.id);
  if (existing) Object.assign(existing, JSON.parse(JSON.stringify(d)));
  else state.characters.push(JSON.parse(JSON.stringify(d)));
  save(); $('#charModal').hidden = true; renderAll();
});
$('#btnDeleteChar').addEventListener('click', () => {
  const d = ui.draft;
  if (!confirm(`Delete ${d.name}? Their links will be removed too.`)) return;
  state.characters = state.characters.filter(c => c.id !== d.id);
  state.links = state.links.filter(l => l.from !== d.id && l.to !== d.id);
  delete state.positions.family[d.id]; delete state.positions.social[d.id];
  if (ui.selected === d.id) ui.selected = null;
  save(); $('#charModal').hidden = true; renderAll();
});

/* canvas: select / drag / pan / zoom */
const canvas = $('#canvas');
let drag = null, pan = null;

function sceneXY(ev){
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left - ui.panX) / ui.zoom, y: (ev.clientY - r.top - ui.panY) / ui.zoom };
}
canvas.addEventListener('mousedown', ev => {
  const node = ev.target.closest('.node');
  if (node){
    const id = node.dataset.id, p = lastLayout.pos[id];
    const s = sceneXY(ev);
    drag = { id, dx: s.x - p.x, dy: s.y - p.y, moved: false };
    ui.selected = id; renderCharList(); renderGraph();
  } else {
    pan = { x: ev.clientX - ui.panX, y: ev.clientY - ui.panY };
    canvas.classList.add('panning');
  }
});
window.addEventListener('mousemove', ev => {
  if (drag){
    const s = sceneXY(ev);
    const mode = ui.view === 'social' ? 'social' : 'family';
    state.positions[mode][drag.id] = { x: Math.round(s.x - drag.dx), y: Math.round(s.y - drag.dy) };
    drag.moved = true; renderGraph();
  } else if (pan){
    ui.panX = ev.clientX - pan.x; ui.panY = ev.clientY - pan.y;
    const scene = document.getElementById('scene');
    if (scene) scene.setAttribute('transform', `translate(${ui.panX},${ui.panY}) scale(${ui.zoom})`);
  }
});
window.addEventListener('mouseup', () => {
  if (drag && drag.moved) save();
  drag = null; pan = null; canvas.classList.remove('panning');
});
canvas.addEventListener('dblclick', ev => {
  const node = ev.target.closest('.node');
  if (node) openChar(node.dataset.id);
});
canvas.addEventListener('wheel', ev => {
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  const old = ui.zoom;
  ui.zoom = Math.min(2.5, Math.max(0.12, ui.zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
  ui.panX = mx - (mx - ui.panX) * (ui.zoom / old);
  ui.panY = my - (my - ui.panY) * (ui.zoom / old);
  renderGraph();
}, { passive: false });

window.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') $('#charModal').hidden = true;
});

/* boot */
renderAll();
fitView();
