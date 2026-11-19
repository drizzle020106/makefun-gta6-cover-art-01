// Vice Cover Studio — the cover engine.
// Draws a multi-panel, GTA-poster-style cover onto any 2D canvas: panels of
// photos with a sunset / neon colour grade, a bold display caption with a
// gradient fill and hard outline, and a tagline. Everything is drawn by hand
// with canvas gradients and filters; no artwork, logo or font is borrowed
// from any game. The caption font is Anton (SIL Open Font License), shipped
// under app/fonts/.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  hero: 'Hero + two',
  quad: 'Four panels',
  strip: 'Hero + strip',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon nights',
  dusk: 'Dusk',
};

const PANEL_COUNT = { hero: 3, quad: 4, strip: 4 };

export function panelCount(layout) {
  return PANEL_COUNT[layout] ?? 3;
}

/** Panel rectangles for a layout, in unit coordinates, adapted to the aspect. */
export function layoutRects(layout, w, h) {
  const wide = w >= h;
  if (layout === 'quad') {
    return [
      [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5],
    ];
  }
  if (layout === 'strip') {
    const heroH = wide ? 0.62 : 0.55;
    const third = 1 / 3;
    return [
      [0, 0, 1, heroH],
      [0, heroH, third, 1 - heroH],
      [third, heroH, third, 1 - heroH],
      [2 * third, heroH, third, 1 - heroH],
    ];
  }
  // hero: one big panel plus two small ones.
  if (wide) {
    return [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ];
  }
  return [
    [0, 0, 1, 0.58],
    [0, 0.58, 0.5, 0.42],
    [0.5, 0.58, 0.5, 0.42],
  ];
}

/** The colour grade for one panel: a canvas filter plus overlay stops. */
function gradeStyle(grade) {
  if (grade === 'neon') {
    return {
      filter: 'saturate(1.45) contrast(1.12) brightness(1.05)',
      top: 'rgba(0, 229, 255, 0.10)',
      bottom: 'rgba(255, 0, 128, 0.38)',
      vignette: 'rgba(10, 0, 40, 0.55)',
    };
  }
  if (grade === 'dusk') {
    return {
      filter: 'saturate(1.05) contrast(1.08) brightness(0.94)',
      top: 'rgba(90, 40, 160, 0.12)',
      bottom: 'rgba(30, 8, 70, 0.45)',
      vignette: 'rgba(8, 0, 24, 0.55)',
    };
  }
  return {
    filter: 'saturate(1.35) contrast(1.10) brightness(1.03)',
    top: 'rgba(255, 190, 80, 0.10)',
    bottom: 'rgba(214, 40, 110, 0.42)',
    vignette: 'rgba(30, 0, 40, 0.5)',
  };
}

/** Draws one photo into a panel rect, cover-fit, with the panel's crop. */
function drawPanel(ctx, rect, photo, panel, px, py, pw, ph) {
  const g = gradeStyle(panel.grade);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (photo) {
    const base = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const iw = photo.naturalWidth * scale;
    const ih = photo.naturalHeight * scale;
    const cx = px + (pw - iw) / 2 + (panel.ox || 0) * pw;
    const cy = py + (ph - ih) / 2 + (panel.oy || 0) * ph;
    ctx.filter = g.filter;
    ctx.drawImage(photo, cx, cy, iw, ih);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#241533';
    ctx.fillRect(px, py, pw, ph);
  }
  // Sunset / neon wash, stronger at the foot of the panel.
  const wash = ctx.createLinearGradient(0, py, 0, py + ph);
  wash.addColorStop(0, g.top);
  wash.addColorStop(1, g.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(px, py, pw, ph);
  // Vignette: darkened corners so the panel reads as a poster frame.
  const vig = ctx.createRadialGradient(
    px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35,
    px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, g.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(px, py, pw, ph);
  // Thin bright frame inside the panel edge.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(2, pw * 0.004);
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  ctx.restore();
}

/** Splits a caption into at most two lines that fit the width. */
function wrapCaption(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`.trim();
    }
  }
  return lines.map((l) => l.trim()).filter(Boolean).slice(0, 2);
}

/** Draws the tagline and the big caption across the foot of the cover. */
function drawCaption(ctx, w, h, caption, tagline) {
  const text = (caption || '').trim().toUpperCase();
  const tag = (tagline || '').trim().toUpperCase();
  if (!text && !tag) return;
  // Scrim so the lettering stays readable over any photo.
  const bandH = h * 0.24;
  const scrim = ctx.createLinearGradient(0, h - bandH, 0, h);
  scrim.addColorStop(0, 'rgba(20, 4, 36, 0)');
  scrim.addColorStop(1, 'rgba(20, 4, 36, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - bandH, w, bandH);

  const cx = w / 2;
  let cursor = h - h * 0.055; // baseline of the caption's last line
  if (text) {
    let size = h * 0.115;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    let lines = wrapCaption(ctx, text, w * 0.92);
    while (lines.length > 1 && size > h * 0.05) {
      size -= 2;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
      lines = wrapCaption(ctx, text, w * 0.92);
    }
    while (lines.some((l) => ctx.measureText(l).width > w * 0.92) && size > 12) {
      size -= 2;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
      lines = wrapCaption(ctx, text, w * 0.92);
    }
    const lineH = size * 1.02;
    const top = cursor - (lines.length - 1) * lineH;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    lines.forEach((line, i) => {
      const y = top + i * lineH;
      // Sunset gradient fill, dark outline, hard drop shadow.
      const fill = ctx.createLinearGradient(0, y - size, 0, y + size * 0.15);
      fill.addColorStop(0, '#fff7e0');
      fill.addColorStop(0.55, '#ffd166');
      fill.addColorStop(1, '#ff5e78');
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = size * 0.12;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeStyle = '#160428';
      ctx.lineWidth = size * 0.09;
      ctx.strokeText(line, cx, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = fill;
      ctx.fillText(line, cx, y);
    });
    cursor = top - size * 1.02; // tagline baseline: clear above the caption
  }
  if (tag) {
    const tagSize = Math.max(14, h * 0.026);
    ctx.font = `bold ${tagSize}px "Arial Narrow", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = tagSize * 0.3;
    const spaced = tag.split('').join(' ');
    ctx.fillText(spaced, cx, cursor);
    ctx.shadowBlur = 0;
  }
}

/**
 * Draws the whole cover.
 * state: { layout, caption, tagline, panels: [{ photo, zoom, ox, oy, grade }] }
 * photos: a map from photo id to an HTMLImageElement (or null).
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160428';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutRects(state.layout, w, h);
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  rects.forEach((r, i) => {
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0, grade: 'sunset' };
    const px = r[0] * w + gap / 2;
    const py = r[1] * h + gap / 2;
    const pw = r[2] * w - gap;
    const ph = r[3] * h - gap;
    drawPanel(ctx, r, photos[panel.photo] || null, panel, px, py, pw, ph);
  });
  // Outer frame: a neon gradient border around the whole cover.
  const frame = ctx.createLinearGradient(0, 0, w, h);
  frame.addColorStop(0, '#ff9e00');
  frame.addColorStop(0.5, '#ff2e88');
  frame.addColorStop(1, '#00e5ff');
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.max(4, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  drawCaption(ctx, w, h, state.caption, state.tagline);
}

/** Renders the cover at exact export size and resolves with a PNG blob. */
export function renderCoverPNG(state, photos, sizeKey) {
  const size = SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state, photos);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
