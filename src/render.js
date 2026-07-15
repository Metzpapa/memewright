import { createCanvas, loadImage } from '@napi-rs/canvas';
import { DEFAULT_FONT } from './font.js';
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
  minFontPx: 12,
  lineHeight: 1.02,
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
  const px = resolveBox(box, ctx.canvas.width, ctx.canvas.height);
  const pad = Math.min(px.w, px.h) * s.padding;
  const inner = { w: px.w - 2 * pad, h: px.h - 2 * pad };

  const value = s.allCaps ? String(text).toUpperCase() : String(text);
  const { fontSize, lines, lineHeight, overflow } = fitText(ctx, value, inner, {
    font: style.font || DEFAULT_FONT,
    maxFontSize: inner.h * s.maxFontFrac,
    minFontSize: s.minFontPx,
    lineHeight: s.lineHeight,
  });

  ctx.font = `${fontSize}px "${style.font || DEFAULT_FONT}"`;
  ctx.textAlign = s.align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.fillStyle = s.color;
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = Math.max(1, fontSize * s.strokeRatio) * (s.stroke ? 1 : 0);

  const anchorX =
    s.align === 'left' ? px.x + pad :
    s.align === 'right' ? px.x + px.w - pad :
    px.x + px.w / 2;

  const blockH = lines.length * fontSize * lineHeight;
  let startY =
    s.valign === 'top' ? px.y + pad :
    s.valign === 'bottom' ? px.y + px.h - pad - blockH :
    px.y + (px.h - blockH) / 2;

  lines.forEach((line, i) => {
    const y = startY + i * fontSize * lineHeight;
    if (s.stroke) ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
  });

  return { overflow: !!overflow, fontSize };
}

/**
 * Render a meme.
 * @param {object} template  { image (Buffer|path|Image), boxes: [...] }
 * @param {object|Array} captions  map of boxId -> text, or array in box order
 * @param {object} [opts] { format: 'png'|'jpeg', quality }
 * @returns {Promise<{ buffer: Buffer, warnings: string[] }>}
 */
export async function renderMeme(template, captions, opts = {}) {
  const img = await loadImage(template.image);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const warnings = [];
  const boxes = template.boxes || [];

  boxes.forEach((box, i) => {
    const text = Array.isArray(captions)
      ? captions[i]
      : (captions[box.id] ?? captions[box.name]);
    if (text == null || text === '') return; // empty box is allowed
    const { overflow } = drawCaption(ctx, text, box, box.style || {}, img.height);
    if (overflow) warnings.push(`Caption "${box.id}" is long; rendered at minimum size.`);
  });

  const format = opts.format || 'png';
  const buffer = format === 'jpeg'
    ? await canvas.encode('jpeg', opts.quality ?? 92)
    : await canvas.encode('png');

  return { buffer, warnings };
}
