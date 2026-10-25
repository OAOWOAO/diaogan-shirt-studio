const ASSET_CATEGORIES = {
  original: [
    ['carrot', '胡蘿蔔', 'carrot-line.png'],
    ['cloud', '雲朵', 'cloud-line.png'],
    ['chair', '椅子', 'chair-line.png'],
    ['sprout', '嫩芽', 'sprout-line.png'],
    ['chef', '廚師', 'chef-line.png'],
    ['flower', '花花', 'flower-line.png'],
    ['blob', '小方怪', 'blob-line.png'],
    ['sax', '薩克斯風', 'sax-line.png'],
    ['acorn', '橡實', 'acorn-line.png'],
    ['monster', '長耳怪', 'monster-line.png'],
    ['star-devil', '星星惡魔', 'star-devil-line.png'],
    ['hanging-character', '吊掛角色', 'hanging-character-line.png'],
    ['bat', '蝙蝠怪', 'bat-line.png']
  ],
  xiaolai: [
    ['xiaolai-bone', '骨頭怪', 'xiaolai-bone-line.png'],
    ['xiaolai-acorn', '小橡實', 'xiaolai-acorn-line.png'],
    ['xiaolai-chair', '小椅子', 'xiaolai-chair-line.png'],
    ['xiaolai-house', '閃電屋', 'xiaolai-house-line.png'],
    ['xiaolai-riceball', '飯糰', 'xiaolai-riceball-line.png'],
    ['xiaolai-watermelon', '西瓜', 'xiaolai-watermelon-line.png'],
    ['xiaolai-volleyball', '排球', 'xiaolai-volleyball-line.png'],
    ['xiaolai-toast', '吐司', 'xiaolai-toast-line.png'],
    ['xiaolai-carton', '紙盒屋', 'xiaolai-carton-line.png'],
    ['xiaolai-carrot', '小蘿蔔', 'xiaolai-carrot-line.png'],
    ['xiaolai-tree', '小樹', 'xiaolai-tree-line.png'],
    ['xiaolai-fish', '小魚', 'xiaolai-fish-line.png']
  ]
};
const ASSETS = Object.values(ASSET_CATEGORIES).flat();

const LINE_COLORS = ['#111111','#ffffff','#ef6a3b','#e03636','#f0bb31','#3e9c63','#3d75c6','#7955a6'];

const COLORS = [
  ['白色', '#f8f7f2'], ['黑色', '#17191b'], ['深藍', '#202a42'],
  ['麻灰', '#b8b7b1'], ['沙棕', '#c7ad87'], ['霧紅', '#a85559'],
  ['淺粉', '#e9bdca'], ['淺藍', '#a8cddd'], ['黃綠', '#a9c768'],
  ['亮綠', '#3a8f58'], ['水藍', '#4eb5c4'], ['紫羅蘭', '#71569a']
];

const SIZE_SPECS = {
  M: { length: 69, chest: 52, shoulder: 46, sleeve: 20, widthPx: 450, heightPx: 443 },
  L: { length: 73, chest: 55, shoulder: 50, sleeve: 22, widthPx: 476, heightPx: 469 }
};

const SHIRT_TEMPLATES = {
  front: { mask: 'shirt-front-mask.png', lines: 'shirt-front-lines.png', lightLines: 'shirt-front-lines-light.png' },
  back: { mask: 'shirt-back-mask.png', lines: 'shirt-back-lines.png', lightLines: 'shirt-back-lines-light.png' }
};

const canvas = document.querySelector('#designCanvas');
const ctx = canvas.getContext('2d');
const assetGrid = document.querySelector('#assetGrid');
const canvasWrap = document.querySelector('.canvas-wrap');
const selectionControls = document.querySelector('#selectionControls');
const scaleRange = document.querySelector('#scaleRange');
const rotateRange = document.querySelector('#rotateRange');
const scaleNumber = document.querySelector('#scaleNumber');
const rotateNumber = document.querySelector('#rotateNumber');
const brushSizeRange = document.querySelector('#brushSizeRange');
const brushSizeNumber = document.querySelector('#brushSizeNumber');
const brushOpacityRange = document.querySelector('#brushOpacityRange');
const brushOpacityNumber = document.querySelector('#brushOpacityNumber');
const shirtScaleRange = document.querySelector('#shirtScaleRange');
const shirtScaleNumber = document.querySelector('#shirtScaleNumber');
const toast = document.querySelector('#toast');

const images = new Map();
const tintedImages = new Map();
const shirtImages = { front: {}, back: {} };
function defaultViewZoom() { return window.matchMedia('(max-width: 740px)').matches ? 1.18 : 1.08; }
const state = {
  side: 'front', size: 'M', shirtColor: COLORS[0][1], shirtScale: 1, showSafe: false,
  front: [], back: [], frontStrokes: [], backStrokes: [],
  tool: 'select', brushColor: '#ef6a3b', brushSize: 10, brushOpacity: 100,
  selectedId: null, history: [], future: [],
  viewZoom: defaultViewZoom(),
  viewX: 0, viewY: 0
};

let drag = null;
let toastTimer = null;
let rangeBefore = null;
let resetArmed = false;
let resetTimer = null;
let activeAssetCategory = 'original';
const activePointers = new Map();
let pinch = null;
const VIEW_MIN = .75;
const VIEW_MAX = 2.8;

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function currentItems() { return state[state.side]; }
function currentStrokes() { return state[state.side === 'front' ? 'frontStrokes' : 'backStrokes']; }
function selectedItem() { return currentItems().find(item => item.id === state.selectedId) || null; }

function saveLocal() {
  const compact = {
    side: state.side, size: state.size, shirtColor: state.shirtColor, shirtScale: state.shirtScale,
    showSafe: state.showSafe, safeGuideVersion: 2,
    front: state.front, back: state.back, frontStrokes: state.frontStrokes,
    backStrokes: state.backStrokes, tool: state.tool, brushColor: state.brushColor,
    brushSize: state.brushSize, brushOpacity: state.brushOpacity
  };
  localStorage.setItem('diaogan-shirt-studio-v1', JSON.stringify(compact));
}

function restoreLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem('diaogan-shirt-studio-v1'));
    if (!saved) return;
    Object.assign(state, saved, {
      showSafe: saved.safeGuideVersion === 2 ? !!saved.showSafe : false,
      shirtScale: Number.isFinite(saved.shirtScale) ? saved.shirtScale : 1,
      frontStrokes: saved.frontStrokes || [], backStrokes: saved.backStrokes || [],
      tool: saved.tool || 'select', brushColor: saved.brushColor || '#ef6a3b', brushSize: saved.brushSize || 10,
      brushOpacity: Number.isFinite(saved.brushOpacity) ? Math.max(1, Math.min(100, saved.brushOpacity)) : 100,
      selectedId: null, history: [], future: []
    });
    [...state.front, ...state.back].forEach(item => { if (!item.lineColor) item.lineColor = '#111111'; });
  } catch (_) {}
}

function snapshot() { return JSON.stringify({ front: state.front, back: state.back, frontStrokes: state.frontStrokes, backStrokes: state.backStrokes, size: state.size, shirtColor: state.shirtColor, shirtScale: state.shirtScale }); }
function pushHistory(before = snapshot()) {
  if (state.history.at(-1) !== before) state.history.push(before);
  if (state.history.length > 80) state.history.shift();
  state.future = [];
}

function applySnapshot(raw) {
  const data = JSON.parse(raw);
  state.front = data.front; state.back = data.back;
  state.frontStrokes = data.frontStrokes || []; state.backStrokes = data.backStrokes || [];
  state.size = data.size; state.shirtColor = data.shirtColor; state.shirtScale = data.shirtScale || 1;
  state.selectedId = null; syncControls(); render(); saveLocal();
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state.future.push(snapshot()); applySnapshot(previous);
}

function redo() {
  const next = state.future.pop();
  if (!next) return;
  state.history.push(snapshot()); applySnapshot(next);
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function loadAssets() {
  for (const [key, label, file] of ASSETS) {
    const img = new Image();
    img.src = `./assets/${file}`;
    img.onload = render;
    images.set(key, img);
  }
  for (const [side, files] of Object.entries(SHIRT_TEMPLATES)) {
    for (const [layer, file] of Object.entries(files)) {
      const img = new Image();
      img.src = `./assets/${file}?v=13`;
      img.onload = render;
      shirtImages[side][layer] = img;
    }
    shirtImages[side].colours = COLORS.map((_, index) => {
      const img = new Image();
      img.src = `./assets/shirt-${side}-color-${index}.png?v=21`;
      img.onload = render;
      return img;
    });
  }
  renderAssetCategory();

  document.querySelectorAll('.asset-category').forEach(button => {
    button.addEventListener('click', () => {
      activeAssetCategory = button.dataset.category;
      document.querySelectorAll('.asset-category').forEach(tab => {
        const selected = tab === button;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      renderAssetCategory();
    });
  });
}

function renderAssetCategory() {
  assetGrid.replaceChildren();
  for (const [key, label, file] of ASSET_CATEGORIES[activeAssetCategory]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'asset-card'; button.title = `加入${label}`;
    button.draggable = true; button.dataset.asset = key;
    button.innerHTML = `<img src="./assets/${file}" alt="${label}"><span>${label}</span>`;
    button.addEventListener('click', () => addAsset(key));
    button.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', key));
    assetGrid.appendChild(button);
  }
}

function buildColors() {
  const grid = document.querySelector('#colorGrid');
  COLORS.forEach(([label, value]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'color-swatch'; b.title = label; b.dataset.color = value;
    b.style.background = value; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => {
      pushHistory(); state.shirtColor = value; syncControls(); render(); saveLocal();
    });
    grid.appendChild(b);
  });

  const brushGrid = document.querySelector('#brushColorGrid');
  LINE_COLORS.forEach(value => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'brush-swatch'; b.dataset.brushColor = value;
    b.style.background = value; b.setAttribute('aria-label', `畫筆顏色 ${value}`);
    b.addEventListener('click', () => { state.brushColor = value; if(state.tool === 'eraser') state.tool = 'brush'; syncControls(); saveLocal(); });
    brushGrid.appendChild(b);
  });

  const patternGrid = document.querySelector('#patternColorGrid');
  LINE_COLORS.forEach(value => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pattern-swatch'; b.dataset.lineColor = value;
    b.style.background = value; b.setAttribute('aria-label', `圖案線條顏色 ${value}`);
    b.addEventListener('click', () => updateSelected(item => { item.lineColor = value; }));
    patternGrid.appendChild(b);
  });
}

function garmentGeometry() {
  const spec = SIZE_SPECS[state.size];
  const cx = 310; const top = 86;
  const width = spec.widthPx * state.shirtScale; const height = spec.heightPx * state.shirtScale;
  const left = cx - width / 2; const right = cx + width / 2;
  const bodyLeft = cx - width * .34; const bodyRight = cx + width * .34;
  const hem = top + height;
  return { spec, cx, top, width, height, left, right, bodyLeft, bodyRight, hem };
}

function safeZone() {
  const g = garmentGeometry();
  const pxPerCm = (g.bodyRight - g.bodyLeft) / g.spec.chest;
  if (state.side === 'front') {
    const side = 10 * pxPerCm;
    return { x: g.cx + (g.bodyRight - g.cx) * .33, y: g.top + g.height * .29, w: side, h: side, label: '左胸 10 × 10 cm' };
  }
  const side = 25 * pxPerCm;
  return { x: g.cx, y: g.top + g.height * .38, w: side, h: side, label: '背面 25 × 25 cm' };
}

function drawGarment(target = ctx) {
  const g = garmentGeometry();
  const template = shirtImages[state.side];
  const x = g.cx - g.width / 2;
  const colourIndex = Math.max(0, COLORS.findIndex(([, value]) => value === state.shirtColor));
  const shirt = template.colours?.[colourIndex];
  if (shirt?.naturalWidth) target.drawImage(shirt, x, g.top, g.width, g.height);
}

function itemMetrics(item) {
  const img = images.get(item.asset);
  if (!img || !img.naturalWidth) return { w: 80, h: 80 };
  const ratio = img.naturalWidth / img.naturalHeight;
  const base = 90 * item.scale;
  return ratio >= 1 ? { w: base, h: base / ratio } : { w: base * ratio, h: base };
}

function drawItem(item, target = ctx, offset = {x:0,y:0}, ratio = 1) {
  const img = images.get(item.asset); if (!img?.complete) return;
  const color = item.lineColor || '#111111';
  const cacheKey = `${item.asset}|${color}`;
  let tinted = tintedImages.get(cacheKey);
  if (!tinted) {
    tinted = document.createElement('canvas'); tinted.width = img.naturalWidth; tinted.height = img.naturalHeight;
    const tc = tinted.getContext('2d'); tc.drawImage(img, 0, 0);
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = color; tc.fillRect(0, 0, tinted.width, tinted.height);
    tintedImages.set(cacheKey, tinted);
  }
  const m = itemMetrics(item);
  target.save(); target.translate((item.x - offset.x) * ratio, (item.y - offset.y) * ratio);
  target.rotate(item.rotation * Math.PI / 180); target.scale(ratio, ratio);
  target.drawImage(tinted, -m.w / 2, -m.h / 2, m.w, m.h); target.restore();
}

function drawStrokes(target = ctx, offset = {x:0,y:0}, ratio = 1) {
  const layer = document.createElement('canvas');
  layer.width = target.canvas.width; layer.height = target.canvas.height;
  const lc = layer.getContext('2d');
  currentStrokes().forEach(stroke => {
    if (!stroke.points.length) return;
    lc.save();
    lc.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
    lc.globalAlpha = stroke.mode === 'erase' ? 1 : (Number.isFinite(stroke.opacity) ? stroke.opacity : 1);
    lc.strokeStyle = stroke.color; lc.lineWidth = stroke.size * ratio;
    lc.lineCap = 'round'; lc.lineJoin = 'round';
    lc.beginPath();
    stroke.points.forEach((p,index) => {
      const x=(p.x-offset.x)*ratio, y=(p.y-offset.y)*ratio;
      if(index===0) lc.moveTo(x,y); else lc.lineTo(x,y);
    });
    if(stroke.points.length===1){ const p=stroke.points[0]; lc.lineTo((p.x-offset.x)*ratio+.01,(p.y-offset.y)*ratio+.01); }
    lc.stroke(); lc.restore();
  });
  const g = garmentGeometry();
  const shirt = selectedShirtImage(state.side);
  if (shirt?.naturalWidth) {
    lc.save();
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(
      shirt,
      (g.cx - g.width / 2 - offset.x) * ratio,
      (g.top - offset.y) * ratio,
      g.width * ratio,
      g.height * ratio
    );
    lc.restore();
  }
  target.drawImage(layer,0,0);
}

function itemCorners(item) {
  const {w,h} = itemMetrics(item); const a = item.rotation * Math.PI / 180;
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y]) => ({x:item.x+x*Math.cos(a)-y*Math.sin(a), y:item.y+x*Math.sin(a)+y*Math.cos(a)}));
}

function itemInsideZone(item, zone = safeZone()) {
  return itemCorners(item).every(p => p.x >= zone.x-zone.w/2 && p.x <= zone.x+zone.w/2 && p.y >= zone.y-zone.h/2 && p.y <= zone.y+zone.h/2);
}

function drawSelection(item) {
  const {w,h} = itemMetrics(item);
  ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation*Math.PI/180);
  ctx.strokeStyle = '#ef6a3b'; ctx.lineWidth = 2; ctx.setLineDash([7,5]);
  ctx.strokeRect(-w/2-7,-h/2-7,w+14,h+14); ctx.setLineDash([]);
  ctx.fillStyle = '#ef6a3b';
  for (const [x,y] of [[-w/2-7,-h/2-7],[w/2+7,-h/2-7],[w/2+7,h/2+7],[-w/2-7,h/2+7]]) { ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

function render(options = {}) {
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.setTransform(state.viewZoom,0,0,state.viewZoom,state.viewX,state.viewY);
  const zone = safeZone();
  drawGarment(ctx);
  drawStrokes(ctx);
  currentItems().forEach(item => drawItem(item));
  if (state.showSafe && !options.clean) {
    ctx.save(); ctx.strokeStyle = 'rgba(239,106,59,.85)'; ctx.lineWidth = 2; ctx.setLineDash([8,7]);
    ctx.strokeRect(zone.x-zone.w/2,zone.y-zone.h/2,zone.w,zone.h);
    ctx.fillStyle = 'rgba(239,106,59,.10)'; ctx.fillRect(zone.x-zone.w/2,zone.y-zone.h/2,zone.w,zone.h);
    ctx.font = '700 13px sans-serif'; ctx.fillStyle = '#b94320'; ctx.fillText(`${zone.label} · 示意`,zone.x-zone.w/2,zone.y-zone.h/2-10); ctx.restore();
  }
  const selected = selectedItem(); if (selected && !options.clean) drawSelection(selected);
  ctx.restore();
  document.querySelector('#viewZoomValue').textContent = `${Math.round(state.viewZoom * 100)}%`;
  updateZoneStatus();
}

function addAsset(asset, point = null) {
  pushHistory(); const zone = safeZone();
  const spread = Math.min(zone.w, zone.h) * .12;
  const item = { id: uid(), asset, x: point?.x ?? zone.x + (Math.random()-.5)*spread, y: point?.y ?? zone.y + (Math.random()-.5)*spread, scale: state.side === 'front' ? .52 : 1.05, rotation: 0, lineColor: '#111111' };
  currentItems().push(item); state.selectedId = item.id; syncSelectionControls(); render(); saveLocal();
}

function canvasPoint(event) {
  const r = canvas.getBoundingClientRect();
  return { x: (event.clientX-r.left) * canvas.width/r.width, y: (event.clientY-r.top) * canvas.height/r.height };
}

function workspacePoint(point) {
  return { x: (point.x-state.viewX)/state.viewZoom, y: (point.y-state.viewY)/state.viewZoom };
}

function pointerCenter(points = [...activePointers.values()]) {
  if (!points.length) return {x:canvas.width/2,y:canvas.height/2};
  return {x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length};
}

function clampView() {
  const visible = 90;
  const scaledW = canvas.width * state.viewZoom;
  const scaledH = canvas.height * state.viewZoom;
  state.viewX = Math.min(canvas.width-visible, Math.max(visible-scaledW, state.viewX));
  state.viewY = Math.min(canvas.height-visible, Math.max(visible-scaledH, state.viewY));
}

function setViewZoom(nextZoom, anchor = {x:canvas.width/2,y:canvas.height/2}) {
  const oldZoom = state.viewZoom;
  const anchorWorld = {x:(anchor.x-state.viewX)/oldZoom,y:(anchor.y-state.viewY)/oldZoom};
  state.viewZoom = Math.max(VIEW_MIN,Math.min(VIEW_MAX,nextZoom));
  state.viewX = anchor.x-anchorWorld.x*state.viewZoom;
  state.viewY = anchor.y-anchorWorld.y*state.viewZoom;
  clampView(); render();
}

function centerView(zoom = defaultViewZoom()) {
  state.viewZoom = Math.max(VIEW_MIN,Math.min(VIEW_MAX,zoom));
  state.viewX = canvas.width*(1-state.viewZoom)/2;
  state.viewY = canvas.height*(1-state.viewZoom)/2;
  clampView(); render();
}

function pointerDistance(points = [...activePointers.values()]) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x-points[1].x, points[0].y-points[1].y);
}

function hitTest(point) {
  const items = currentItems();
  for (let i=items.length-1; i>=0; i--) {
    const item = items[i], {w,h}=itemMetrics(item), a=-item.rotation*Math.PI/180;
    const dx=point.x-item.x, dy=point.y-item.y;
    const x=dx*Math.cos(a)-dy*Math.sin(a), y=dx*Math.sin(a)+dy*Math.cos(a);
    if (Math.abs(x)<=w/2+10 && Math.abs(y)<=h/2+10) return item;
  }
  return null;
}

canvas.addEventListener('pointerdown', event => {
  const screenPoint=canvasPoint(event);
  const point=workspacePoint(screenPoint);
  if(state.tool === 'brush' || state.tool === 'eraser'){
    if(!event.isPrimary || drag?.stroke) return;
    const before=snapshot();
    const stroke={
      mode:state.tool==='eraser'?'erase':'draw',
      color:state.brushColor,
      size:state.brushSize,
      opacity:state.tool==='eraser'?1:state.brushOpacity/100,
      points:[point]
    };
    currentStrokes().push(stroke); drag={stroke,before,pointerId:event.pointerId}; canvas.setPointerCapture(event.pointerId); render(); return;
  }
  activePointers.set(event.pointerId,screenPoint);
  canvas.setPointerCapture(event.pointerId);

  if(activePointers.size===2){
    const item=drag?.id ? selectedItem() : null;
    if(item && item.id===drag.id){
      pinch={kind:'item',id:item.id,startDistance:pointerDistance(),startScale:item.scale,before:drag.before||snapshot()};
    }else{
      const center=pointerCenter();
      pinch={kind:'view',startDistance:pointerDistance(),startZoom:state.viewZoom,anchor:workspacePoint(center)};
    }
    drag=null;
    return;
  }

  if(activePointers.size>1) return;
  const item=hitTest(point);
  state.selectedId=item?.id || null; syncSelectionControls(); render();
  if (!item){drag={view:true,startScreen:screenPoint,startX:state.viewX,startY:state.viewY,pointerId:event.pointerId};return;}
  drag={id:item.id,dx:point.x-item.x,dy:point.y-item.y,before:snapshot(),pointerId:event.pointerId};
});
canvas.addEventListener('pointermove', event => {
  if(activePointers.has(event.pointerId)) activePointers.set(event.pointerId,canvasPoint(event));
  if(pinch){
    if(activePointers.size<2) return;
    const ratio=pointerDistance()/Math.max(1,pinch.startDistance);
    if(pinch.kind==='item'){
      const item=selectedItem();
      if(!item || item.id!==pinch.id) return;
      item.scale=Math.max(.2,Math.min(2.2,pinch.startScale*ratio));
      syncSelectionControls(); render(); return;
    }
    const center=pointerCenter();
    state.viewZoom=Math.max(VIEW_MIN,Math.min(VIEW_MAX,pinch.startZoom*ratio));
    state.viewX=center.x-pinch.anchor.x*state.viewZoom;
    state.viewY=center.y-pinch.anchor.y*state.viewZoom;
    clampView(); render(); return;
  }
  if (!drag) return;
  if(event.pointerId!==drag.pointerId) return;
  if(drag.stroke){drag.stroke.points.push(workspacePoint(canvasPoint(event)));render();return;}
  if(drag.view){
    const screen=canvasPoint(event);
    state.viewX=drag.startX+(screen.x-drag.startScreen.x);
    state.viewY=drag.startY+(screen.y-drag.startScreen.y);
    clampView(); render(); return;
  }
  const item=selectedItem(); if (!item) return;
  const point=workspacePoint(canvasPoint(event)); item.x=point.x-drag.dx; item.y=point.y-drag.dy; render();
});
function finishPointer(event) {
  activePointers.delete(event.pointerId);
  if(canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if(pinch){
    if(pinch.kind==='item')pushHistory(pinch.before);
    pinch=null; drag=null;
    syncSelectionControls(); saveLocal(); updateZoneStatus(); return;
  }
  if (!drag || event.pointerId!==drag.pointerId) return;
  if(drag.before)pushHistory(drag.before);
  drag=null; saveLocal(); updateZoneStatus();
}
canvas.addEventListener('pointerup',finishPointer);
canvas.addEventListener('pointercancel',finishPointer);

canvasWrap.addEventListener('dragover', e => { e.preventDefault(); canvasWrap.classList.add('dragover'); });
canvasWrap.addEventListener('dragleave', () => canvasWrap.classList.remove('dragover'));
canvasWrap.addEventListener('drop', e => {
  e.preventDefault(); canvasWrap.classList.remove('dragover');
  const key=e.dataTransfer.getData('text/plain'); if (ASSETS.some(a=>a[0]===key)) addAsset(key,workspacePoint(canvasPoint(e)));
});

function updateSelected(mutator) {
  const item=selectedItem(); if (!item) return;
  const before=snapshot(); mutator(item); pushHistory(before); syncSelectionControls(); render(); saveLocal();
}

function moveLayer(delta) {
  const items=currentItems(), index=items.findIndex(x=>x.id===state.selectedId); if(index<0)return;
  const next=Math.max(0,Math.min(items.length-1,index+delta)); if(next===index)return;
  const before=snapshot(); const [item]=items.splice(index,1); items.splice(next,0,item); pushHistory(before); render(); saveLocal();
}

function syncSelectionControls() {
  const item=selectedItem(); selectionControls.disabled=!item;
  if(item){ scaleRange.value=Math.round(item.scale*100); rotateRange.value=Math.round(item.rotation); scaleNumber.value=scaleRange.value; rotateNumber.value=rotateRange.value; }
  document.querySelectorAll('.pattern-swatch').forEach(b=>b.classList.toggle('active',!!item && b.dataset.lineColor===(item.lineColor||'#111111')));
}

function syncControls() {
  document.querySelectorAll('.side-tab').forEach(b=>{const on=b.dataset.side===state.side;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);});
  document.querySelectorAll('.size-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===state.size));
  document.querySelectorAll('.color-swatch').forEach(b=>b.classList.toggle('active',b.dataset.color===state.shirtColor));
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===state.tool));
  document.querySelectorAll('.brush-swatch').forEach(b=>b.classList.toggle('active',b.dataset.brushColor===state.brushColor));
  brushSizeRange.value=state.brushSize; brushSizeNumber.value=state.brushSize;
  brushOpacityRange.value=state.brushOpacity; brushOpacityNumber.value=state.brushOpacity;
  shirtScaleRange.value=Math.round(state.shirtScale*100); shirtScaleNumber.value=shirtScaleRange.value;
  canvas.style.cursor=state.tool==='select'?'grab':state.tool==='brush'?'crosshair':'cell';
  document.querySelector('#safeToggle').checked=state.showSafe;
  const s=SIZE_SPECS[state.size]; document.querySelector('#sizeInfo').textContent=`衣長 ${s.length} · 胸寬 ${s.chest} · 肩寬 ${s.shoulder} · 袖長 ${s.sleeve} cm`;
  document.querySelector('#zoneBadge').textContent=state.side==='front'?'左胸 10 × 10 cm':'背面 25 × 25 cm';
  syncSelectionControls();
}

function updateZoneStatus() {
  const el=document.querySelector('#zoneStatus');
  el.textContent='位置參考用，衣服外觀並非精準比例';
  el.style.color='';
}

function selectedShirtImage(side) {
  const colourIndex=Math.max(0,COLORS.findIndex(([,value])=>value===state.shirtColor));
  return shirtImages[side].colours?.[colourIndex];
}

function renderSidePreview(side) {
  const previousSide=state.side;
  state.side=side;
  const out=document.createElement('canvas'); out.width=canvas.width; out.height=canvas.height;
  const outCtx=out.getContext('2d');
  drawGarment(outCtx);
  drawStrokes(outCtx);
  currentItems().forEach(item=>drawItem(item,outCtx));
  state.side=previousSide;
  return out;
}

async function downloadMockup() {
  const ready=['front','back'].every(side=>selectedShirtImage(side)?.naturalWidth);
  if(!ready){showToast('衣服素材載入中，請稍後再試');return;}

  const front=renderSidePreview('front');
  const back=renderSidePreview('back');
  const out=document.createElement('canvas'); out.width=1280; out.height=840;
  const outCtx=out.getContext('2d');
  outCtx.fillStyle='#f5f1e8'; outCtx.fillRect(0,0,out.width,out.height);
  outCtx.fillStyle='#fffdf8'; outCtx.fillRect(20,20,610,800); outCtx.fillRect(650,20,610,800);
  outCtx.fillStyle='#172018'; outCtx.font='700 24px sans-serif'; outCtx.textAlign='center';
  outCtx.fillText('正面・左胸',325,58); outCtx.fillText('背面・大圖',955,58);
  outCtx.drawImage(front,15,55,620,760); outCtx.drawImage(back,645,55,620,760);

  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
  if(!blob){showToast('預覽圖產生失敗，請再試一次');return;}
  const filename=`釣竿團服-正背面-${state.size}.png`;
  const file=new File([blob],filename,{type:'image/png'});
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(mobile && navigator.share && navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:'釣竿團服正背面預覽'});showToast('衣服預覽已開啟分享');}
    catch(error){if(error?.name!=='AbortError')showToast('分享未完成，請再試一次');}
    return;
  }
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.download=filename; a.href=url; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500); showToast('正背面衣服預覽已下載');
}

document.querySelectorAll('.side-tab').forEach(b=>b.addEventListener('click',()=>{state.side=b.dataset.side;state.selectedId=null;syncControls();render();saveLocal();}));
document.querySelectorAll('.size-btn').forEach(b=>b.addEventListener('click',()=>{if(state.size===b.dataset.size)return;pushHistory();state.size=b.dataset.size;syncControls();render();saveLocal();}));
document.querySelector('#safeToggle').addEventListener('change',e=>{state.showSafe=e.target.checked;render();saveLocal();});
document.querySelector('#zoomOutBtn').addEventListener('click',()=>setViewZoom(state.viewZoom-.2));
document.querySelector('#zoomInBtn').addEventListener('click',()=>setViewZoom(state.viewZoom+.2));
document.querySelector('#fitViewBtn').addEventListener('click',()=>centerView());
document.querySelectorAll('.tool-btn').forEach(b=>b.addEventListener('click',()=>{state.tool=b.dataset.tool;state.selectedId=null;syncControls();render();saveLocal();}));
document.querySelector('#undoBtn').addEventListener('click',undo);
document.querySelector('#redoBtn').addEventListener('click',redo);
document.querySelector('#backwardBtn').addEventListener('click',()=>moveLayer(-1));
document.querySelector('#forwardBtn').addEventListener('click',()=>moveLayer(1));
document.querySelector('#duplicateBtn').addEventListener('click',()=>updateSelected(item=>{const copy={...item,id:uid(),x:item.x+16,y:item.y+16};currentItems().push(copy);state.selectedId=copy.id;}));
document.querySelector('#deleteBtn').addEventListener('click',()=>{const before=snapshot();state[state.side]=currentItems().filter(x=>x.id!==state.selectedId);state.selectedId=null;pushHistory(before);syncSelectionControls();render();saveLocal();});
document.querySelector('#downloadMockup').addEventListener('click',downloadMockup);
document.querySelector('#clearBrushBtn').addEventListener('click',()=>{if(!currentStrokes().length)return;const before=snapshot();if(state.side==='front')state.frontStrokes=[];else state.backStrokes=[];pushHistory(before);render();saveLocal();showToast('目前衣面的筆跡已清除');});
document.querySelector('#resetAll').addEventListener('click',event=>{
  const button=event.currentTarget;
  if(!resetArmed){
    resetArmed=true; button.textContent='再按一次清空'; button.classList.add('armed');
    showToast('再按一次「再按一次清空」才會全部重來');
    clearTimeout(resetTimer); resetTimer=setTimeout(()=>{resetArmed=false;button.textContent='全部重來';button.classList.remove('armed');},8000);
    return;
  }
  clearTimeout(resetTimer); resetArmed=false; button.textContent='全部重來'; button.classList.remove('armed');
  pushHistory(); state.front=[]; state.back=[]; state.frontStrokes=[]; state.backStrokes=[]; state.selectedId=null;
  syncControls(); render(); saveLocal(); showToast('正面、背面與筆跡已全部清空');
});

scaleRange.addEventListener('pointerdown',()=>{rangeBefore=snapshot();});
scaleRange.addEventListener('input',()=>{const item=selectedItem();if(!item)return;item.scale=Number(scaleRange.value)/100;scaleNumber.value=scaleRange.value;render();});
scaleRange.addEventListener('change',()=>{if(rangeBefore)pushHistory(rangeBefore);rangeBefore=null;saveLocal();});
rotateRange.addEventListener('pointerdown',()=>{rangeBefore=snapshot();});
rotateRange.addEventListener('input',()=>{const item=selectedItem();if(!item)return;item.rotation=Number(rotateRange.value);rotateNumber.value=rotateRange.value;render();});
rotateRange.addEventListener('change',()=>{if(rangeBefore)pushHistory(rangeBefore);rangeBefore=null;saveLocal();});

function bindDirectNumber(numberInput, rangeInput, min, max, apply) {
  numberInput.addEventListener('focus',()=>{rangeBefore=snapshot();});
  numberInput.addEventListener('input',()=>{
    if(numberInput.value==='')return;
    const value=Math.max(min,Math.min(max,Number(numberInput.value)));
    rangeInput.value=value; apply(value); render();
  });
  numberInput.addEventListener('change',()=>{
    const value=Math.max(min,Math.min(max,Number(numberInput.value)||0));
    numberInput.value=value; rangeInput.value=value; apply(value);
    if(rangeBefore)pushHistory(rangeBefore);rangeBefore=null;render();saveLocal();
  });
}
bindDirectNumber(scaleNumber,scaleRange,20,220,value=>{const item=selectedItem();if(item)item.scale=value/100;});
bindDirectNumber(rotateNumber,rotateRange,-180,180,value=>{const item=selectedItem();if(item)item.rotation=value;});

shirtScaleRange.addEventListener('pointerdown',()=>{rangeBefore=snapshot();});
shirtScaleRange.addEventListener('input',()=>{
  state.shirtScale=Number(shirtScaleRange.value)/100;
  shirtScaleNumber.value=shirtScaleRange.value;
  render();
});
shirtScaleRange.addEventListener('change',()=>{
  if(rangeBefore)pushHistory(rangeBefore);
  rangeBefore=null; saveLocal();
});
bindDirectNumber(shirtScaleNumber,shirtScaleRange,70,130,value=>{state.shirtScale=value/100;});

brushSizeRange.addEventListener('input',()=>{state.brushSize=Number(brushSizeRange.value);brushSizeNumber.value=brushSizeRange.value;saveLocal();});
brushSizeNumber.addEventListener('input',()=>{if(brushSizeNumber.value==='')return;state.brushSize=Math.max(2,Math.min(50,Number(brushSizeNumber.value)));brushSizeRange.value=state.brushSize;saveLocal();});
brushSizeNumber.addEventListener('change',()=>{brushSizeNumber.value=state.brushSize;});

brushOpacityRange.addEventListener('input',()=>{
  state.brushOpacity=Number(brushOpacityRange.value);
  brushOpacityNumber.value=brushOpacityRange.value;
  saveLocal();
});
brushOpacityNumber.addEventListener('input',()=>{
  if(brushOpacityNumber.value==='')return;
  state.brushOpacity=Math.max(1,Math.min(100,Number(brushOpacityNumber.value)));
  brushOpacityRange.value=state.brushOpacity;
  saveLocal();
});
brushOpacityNumber.addEventListener('change',()=>{brushOpacityNumber.value=state.brushOpacity;});

window.addEventListener('keydown',e=>{
  const item=selectedItem(); if(!item)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();document.querySelector('#deleteBtn').click();return;}
  const step=e.shiftKey?10:2; const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const before=snapshot();item.x+=moves[e.key][0];item.y+=moves[e.key][1];pushHistory(before);render();saveLocal();}
});

window.addEventListener('pageshow',()=>{
  state.selectedId=null;
  centerView();
  syncSelectionControls();
});

restoreLocal(); centerView(); loadAssets(); buildColors(); syncControls(); render();
