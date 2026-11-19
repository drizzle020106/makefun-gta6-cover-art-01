// Vice Cover Studio — wires the editor: photos, layout, caption, panels and
// export. Photos are read locally with FileReader / object URLs and never
// leave the machine. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js).
import { drawCover, renderCoverPNG, SIZES, LAYOUTS, GRADES, panelCount, layoutRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The editor state: one entry per panel, plus the shared caption. */
export const state = {
  layout: 'hero',
  size: 'square',
  caption: 'Sunset Heist',
  tagline: 'A Leonida Story',
  panels: [
    { photo: 'pier', zoom: 1, ox: 0, oy: 0, grade: 'sunset' },
    { photo: 'boulevard', zoom: 1, ox: 0, oy: 0, grade: 'sunset' },
    { photo: 'pier', zoom: 1.15, ox: 0, oy: 0, grade: 'neon' },
    { photo: 'boulevard', zoom: 1, ox: 0, oy: 0, grade: 'dusk' },
  ],
};

/** Photo ids the app knows, in the order they appear in the panel picker. */
const photoNames = { pier: 'Pier sunset (sample)', boulevard: 'Boulevard (sample)' };
const photos = {};
let selectedPanel = 0;
let uploadCount = 0;

function redraw() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state, photos);
}

/** Rebuilds the panel tabs and the per-panel controls from the state. */
function syncPanelUI() {
  const count = panelCount(state.layout);
  const tabs = document.getElementById('panelTabs');
  tabs.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    if (i === selectedPanel) b.classList.add('active');
    b.addEventListener('click', () => { selectedPanel = i; syncPanelUI(); redraw(); });
    tabs.appendChild(b);
  }
  const select = document.getElementById('panelPhoto');
  select.innerHTML = '';
  for (const [id, name] of Object.entries(photoNames)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  }
  const panel = state.panels[selectedPanel];
  select.value = panel.photo;
  document.getElementById('zoom').value = panel.zoom;
  document.getElementById('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('ox').value = panel.ox;
  document.getElementById('oy').value = panel.oy;
  document.getElementById('grade').value = panel.grade;
}

function setActive(group, value, attr) {
  document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
    b.classList.toggle('active', b.dataset[attr] === value);
  });
}

function exportCover(sizeKey) {
  renderCoverPNG(state, photos, sizeKey).then((blob) => {
    const size = SIZES[sizeKey];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

// Test hook used by the headless-browser checks: renders the cover at exact
// export size and resolves with a PNG data URL. Same code as the buttons.
window.__exportPNG = async (sizeKey) => {
  const blob = await renderCoverPNG(state, photos, sizeKey);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};
window.__state = state;
window.__photosReady = false;

// Size picker.
document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    setActive(null, state.size, 'size');
    redraw();
  });
});

// Layout picker.
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    selectedPanel = 0;
    setActive(null, state.layout, 'layout');
    syncPanelUI();
    redraw();
  });
});

// Caption and tagline.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });

// Grade applies to the selected panel.
document.getElementById('grade').addEventListener('change', (e) => {
  state.panels[selectedPanel].grade = e.target.value;
  redraw();
});

// Per-panel photo, zoom and position.
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panels[selectedPanel].photo = e.target.value;
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  document.getElementById('zoomVal').textContent = `${Math.round(state.panels[selectedPanel].zoom * 100)}%`;
  redraw();
});
document.getElementById('ox').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('oy').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});

// "Use this photo in all panels": one photo filling several panels.
document.getElementById('fillAll').addEventListener('click', () => {
  const photo = state.panels[selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  syncPanelUI();
  redraw();
  status.textContent = 'All panels now use the same photo.';
});

// Sample buttons fill every panel with that sample.
document.querySelectorAll('.sample-btn').forEach((b) => {
  b.addEventListener('click', () => {
    state.panels.forEach((p) => { p.photo = b.dataset.photo; });
    syncPanelUI();
    redraw();
  });
});

// Uploads: read locally, register, assign to the selected panel.
document.getElementById('upload').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    uploadCount += 1;
    const id = `upload${uploadCount}`;
    photoNames[id] = file.name;
    photos[id] = await loadImage(URL.createObjectURL(file));
    state.panels[selectedPanel].photo = id;
    selectedPanel = Math.min(selectedPanel + 1, panelCount(state.layout) - 1);
  }
  syncPanelUI();
  redraw();
  status.textContent = `${files.length} photo${files.length === 1 ? '' : 's'} added — stored only in this browser.`;
  e.target.value = '';
});

// Drag a panel's photo to move it; scroll over it to zoom.
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  const rects = layoutRects(state.layout, 1, 1);
  const i = rects.findIndex((r) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]);
  return i === -1 ? 0 : i;
}
canvas.addEventListener('pointerdown', (e) => {
  selectedPanel = panelAt(e.clientX, e.clientY);
  syncPanelUI();
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[selectedPanel].ox, oy: state.panels[selectedPanel].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[selectedPanel];
  panel.ox = drag.ox + (e.clientX - drag.x) / rect.width;
  panel.oy = drag.oy + (e.clientY - drag.y) / rect.height;
  panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox));
  panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy));
  syncPanelUI();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  syncPanelUI();
  redraw();
}, { passive: false });

// Export buttons.
document.getElementById('exportSquare').addEventListener('click', () => exportCover('square'));
document.getElementById('exportPortrait').addEventListener('click', () => exportCover('portrait'));
document.getElementById('exportLandscape').addEventListener('click', () => exportCover('landscape'));

// Boot: load the two sample photos, then draw (and wait for the font).
async function boot() {
  photos.pier = await loadImage('samples/pier.jpg');
  photos.boulevard = await loadImage('samples/boulevard.jpg');
  window.__photosReady = true;
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* the fallback stack still draws */ }
  syncPanelUI();
  redraw();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    runShot(query.get('shot'), query, { photos, state, redraw, syncPanelUI });
  }
}

boot();
