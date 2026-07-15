// Renders every template with a sample caption in each box, then tiles them into
// one contact sheet so box placements can be eyeballed and tuned.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { listTemplates, getTemplate } from '../src/index.js';
import { renderMeme } from '../src/render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, '..', 'examples', 'contact-sheet.png');

// A readable sample per box id so placement is obvious.
const sample = (id) => id.replace(/_/g, ' ').toUpperCase();

const cells = [];
for (const t of listTemplates()) {
  const tpl = getTemplate(t.slug);
  const captions = {};
  for (const b of tpl.boxes) captions[b.id] = sample(b.id);
  const { buffer } = await renderMeme(tpl, captions, { format: 'png' });
  cells.push({ slug: t.slug, img: await loadImage(buffer) });
}

const cols = 4;
const rows = Math.ceil(cells.length / cols);
const cellW = 360, cellH = 360, pad = 12, labelH = 22;
const W = cols * cellW + (cols + 1) * pad;
const H = rows * (cellH + labelH) + (rows + 1) * pad;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, H);
ctx.fillStyle = '#ddd'; ctx.font = '16px sans-serif'; ctx.textBaseline = 'top';

cells.forEach((c, i) => {
  const col = i % cols, row = Math.floor(i / cols);
  const x = pad + col * (cellW + pad);
  const y = pad + row * (cellH + labelH + pad);
  const scale = Math.min(cellW / c.img.width, cellH / c.img.height);
  const w = c.img.width * scale, h = c.img.height * scale;
  ctx.drawImage(c.img, x + (cellW - w) / 2, y, w, h);
  ctx.fillStyle = '#9ad'; ctx.fillText(c.slug, x, y + cellH + 3);
});

fs.writeFileSync(outPath, await canvas.encode('png'));
console.log('wrote', outPath, `(${cells.length} templates)`);
