// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the exported cover alone, edge to edge.
// Query knobs: photo (sample id, fills all panels), caption, tagline,
// layout (hero | quad | strip), size (square | portrait | landscape),
// grade (sunset | neon | dusk). window.__shotReady is set once painted.
export async function runShot(shot, query, app) {
  const { state, redraw, syncPanelUI } = app;
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline') ?? 'A Leonida Story';
  const layout = query.get('layout') ?? 'hero';
  const size = query.get('size') ?? 'square';
  const grade = query.get('grade') ?? 'sunset';

  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.caption = caption;
  state.tagline = tagline;
  if (layout === 'hero' || layout === 'quad' || layout === 'strip') state.layout = layout;
  if (size === 'square' || size === 'portrait' || size === 'landscape') state.size = size;
  const gradeOk = grade === 'sunset' || grade === 'neon' || grade === 'dusk';
  state.panels.forEach((p, i) => {
    p.photo = photo;
    p.grade = gradeOk ? grade : (i === 2 ? 'neon' : i === 3 ? 'dusk' : 'sunset');
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });
  document.getElementById('caption').value = caption;
  document.getElementById('tagline').value = tagline;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  syncPanelUI();
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
