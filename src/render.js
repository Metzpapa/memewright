import { createCanvas, loadImage } from '@napi-rs/canvas';
import { DEFAULT_FONT, resolveFont } from './font.js';
import { fitText } from './fit.js';

// Box coordinates in template metadata are fractions of the image (0..1) so a
// template renders identically at any resolution. Each box gets a text style.
const STYLE_DEFAULTS = {
  color: '#ffffff',
  stroke: '#000000',
  strokeRatio: 0.09,   // stroke width as a fraction of font size
  allCaps: true,
  align: 'center',     // horizontal: left | center | right
  valign: 'middle',    // vertical: top | middle | bottom
  padding: 0.04,       // inner padding as a fraction of the SHORTER box side
  maxFontFrac: 0.9,    // starting font size as a fraction of box height
  maxFontPx: null,     // absolute cap on font size (imgflip font_max_size), null = none
  minFontPx: 12,
  lineHeight: 1.02,
  rotation: 0,         // box rotation in degrees (imgflip default_settings.rotation)
};

function resolveBox(box, imgW, imgH) {
  return {
    x: box.x * imgW,
    y: box.y * imgH,
    w: box.w * imgW,
    h: box.h * imgH,
  };
}

function drawCaption(ctx, text, box, style, imgH) {
  const s = { ...STYLE_DEFAULTS, ...style };
  const font = resolveFont(style.font || DEFAULT_FONT);
  const px = resolveBox(box, ctx.canvas.width, ctx.canvas.height);
  const pad = Math.min(px.w, px.h) * s.padding;
  const inner = { w: px.w - 2 * pad, h: px.h - 2 * pad };

  const value = s.allCaps ? String(text).toUpperCase() : String(text);
  const { fontSize, lines, lineHeight, overflow } = fitText(ctx, value, inner, {
    font,
    maxFontSize: Math.min(inner.h * s.maxFontFrac, s.maxFontPx ?? Infinity),
    minFontSize: s.minFontPx,
    lineHeight: s.lineHeight,
  });

  ctx.font = `${fontSize}px "${font}"`;
  ctx.textAlign = s.align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.fillStyle = s.color;
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = Math.max(1, fontSize * s.strokeRatio) * (s.stroke ? 1 : 0);

  // Draw relative to the box center so rotation pivots correctly (and works for 0).
  const cx = px.x + px.w / 2;
  const cy = px.y + px.h / 2;
  const anchorX =
    s.align === 'left' ? -px.w / 2 + pad :
    s.align === 'right' ? px.w / 2 - pad :
    0;

  const blockH = lines.length * fontSize * lineHeight;
  const startY =
    s.valign === 'top' ? -px.h / 2 + pad :
    s.valign === 'bottom' ? px.h / 2 - pad - blockH :
    -blockH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  if (s.rotation) ctx.rotate((s.rotation * Math.PI) / 180);
  lines.forEach((line, i) => {
    const y = startY + i * fontSize * lineHeight;
    if (s.stroke) ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
  });
  ctx.restore();

  return { overflow: !!overflow, fontSize };
}

// Composite a logo/sticker/image overlay. Position x,y,w are fractions of the
// canvas (x,y = top-left corner); height follows the image's aspect ratio.
// Optional rotation (deg, about the overlay's center) and opacity (0..1).
async function drawOverlay(ctx, spec) {
  const img = await loadImage(spec.src);
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const w = (spec.w ?? 0.25) * W;
  const h = w * (img.height / img.width);
  const x = (spec.x ?? 0.70) * W;
  const y = (spec.y ?? 0.70) * H;
  ctx.save();
  ctx.globalAlpha = spec.opacity ?? 1;
  if (spec.rotation) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((spec.rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

/**
 * Render a meme.
 * @param {object} template  { image (Buffer|path|Image), boxes: [...] }
 * @param {object|Array} captions  map of boxId -> text, or array in box order
 * @param {object} [opts] { format, quality, images: [{src,x,y,w,rotation,opacity,layer}] }
 * @returns {Promise<{ buffer: Buffer, warnings: string[] }>}
 */
export async function renderMeme(template, captions, opts = {}) {
  const img = await loadImage(template.image);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const warnings = [];
  const boxes = template.boxes || [];
  const overlays = opts.images || [];

  // Overlays with layer:'under' sit beneath the caption text (background Easter
  // eggs); default 'over' sits on top (corner sticker/logo).
  for (const spec of overlays) if (spec.layer === 'under') await drawOverlay(ctx, spec);

  boxes.forEach((box, i) => {
    const text = Array.isArray(captions)
      ? captions[i]
      : (captions[box.id] ?? captions[box.name]);
    if (text == null || text === '') return; // empty box is allowed
    const { overflow } = drawCaption(ctx, text, box, box.style || {}, img.height);
    if (overflow) warnings.push(`Caption "${box.id}" is long; rendered at minimum size.`);
  });

  for (const spec of overlays) if (spec.layer !== 'under') await drawOverlay(ctx, spec);

  const format = opts.format || 'png';
  const buffer = format === 'jpeg'
    ? await canvas.encode('jpeg', opts.quality ?? 92)
    : await canvas.encode('png');

  return { buffer, warnings };
}
