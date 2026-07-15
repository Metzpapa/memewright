// import-imgflip.js
// Pulls imgflip's own per-template typesetting recipe (the `default_settings`
// embedded in each memegenerator page) and writes faithful Memewright templates.
//
// Source of truth for the template LIST + dimensions + canonical image:
//   https://api.imgflip.com/get_memes   (top ~100 templates)
// Source of truth for box geometry + font/color/outline/caps/align/rotation:
//   https://imgflip.com/memegenerator/<Name-With-Hyphens>  (default_settings JSON)
//
// Usage:
//   node scripts/import-imgflip.js --only woman-yelling-at-cat,drake-hotline-bling --dry
//   node scripts/import-imgflip.js            # all 100, writes templates + images
//
// Faithful mode: we reproduce imgflip's default_settings exactly (no cultural
// re-interpretation). Existing hand-written meaning/when_to_use and box ids are
// preserved; only geometry/style/image are (re)written from imgflip.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(here, '..', 'templates');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const onlyArg = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1]
  || (args.includes('--only') ? args[args.indexOf('--only') + 1] : '');
const ONLY = onlyArg ? new Set(onlyArg.split(',').map((s) => s.trim())) : null;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const kebab = (name) =>
  name.toLowerCase().replace(/['".,!?]/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const genSlug = (name) =>
  name.replace(/['".,!?]/g, '').trim().replace(/\s+/g, '-');

const FONT_MAP = { impact: 'Anton', arial: 'Arial', 'arial-bold': 'Arial' };
const mapFont = (f) => FONT_MAP[String(f || '').toLowerCase()] || 'Anton';

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.text();
    } catch (e) { /* retry */ }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw new Error(`fetch failed: ${url}`);
}

// Extract the default_settings array for a given template NAME from its page.
// Matches by NORMALIZED name (case/punctuation-insensitive) and never falls back
// to an unrelated template's block: if the name isn't found, returns null so the
// caller uses safe generic boxes instead of another template's coordinates.
const normName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
function extractDefaultSettings(html, name) {
  const u = html.replace(/\\"/g, '"').replace(/\\\//g, '/');
  const target = normName(name);
  // Index every "name":"..." on the page.
  const names = [];
  const re = /"name":"([^"]{1,80})"/g;
  let m;
  while ((m = re.exec(u))) names.push({ n: m[1], idx: m.index });
  // For each default_settings block, attribute it to the nearest preceding name.
  const key = '"default_settings":"';
  let pos = 0;
  while ((pos = u.indexOf(key, pos)) >= 0) {
    let owner = null;
    for (const nm of names) { if (nm.idx < pos) owner = nm; else break; }
    if (owner && normName(owner.n) === target) {
      const arr = scanArray(u, pos + key.length);
      if (arr && arr.length) return arr;
    }
    pos += key.length;
  }
  return null;
}
function scanArray(s, start) {
  if (s[start] !== '[') return null;
  let depth = 0;
  for (let k = start; k < s.length; k++) {
    if (s[k] === '[') depth++;
    else if (s[k] === ']') { depth--; if (depth === 0) {
      try { return JSON.parse(s.slice(start, k + 1)); } catch (e) { return null; }
    } }
  }
  return null;
}

// imgflip's generic default when a template has no custom default_settings:
// full-width boxes, top & bottom, Impact/white/allCaps (Memewright STYLE_DEFAULTS).
function fallbackBoxes(boxCount) {
  const n = Math.max(1, boxCount || 2);
  if (n === 1) return [{ id: 'text1', x: 0.05, y: 0.03, w: 0.90, h: 0.30, style: { valign: 'top' } }];
  if (n === 2) return [
    { id: 'top', x: 0.05, y: 0.03, w: 0.90, h: 0.30, style: { valign: 'top' } },
    { id: 'bottom', x: 0.05, y: 0.67, w: 0.90, h: 0.30, style: { valign: 'bottom' } },
  ];
  const boxes = []; const h = 0.94 / n;
  for (let i = 0; i < n; i++) boxes.push({ id: `text${i + 1}`, x: 0.05, y: 0.03 + i * h, w: 0.90, h: h * 0.9, style: {} });
  return boxes;
}

function idsFor(slug, boxesImg, existing) {
  if (existing?.boxes?.length === boxesImg.length) return existing.boxes.map((b) => b.id);
  const n = boxesImg.length;
  if (n === 2) {
    const [a, b] = boxesImg;
    const vertical = Math.abs(a.y - b.y) > Math.abs(a.x - b.x);
    return vertical ? ['top', 'bottom'] : ['left', 'right'];
  }
  return boxesImg.map((_, i) => `text${i + 1}`);
}

function toMetaBox(id, b, W, H) {
  const style = {};
  const font = mapFont(b.font);
  if (font !== 'Anton') style.font = font;
  if (b.font_color && b.font_color.toLowerCase() !== '#ffffff') style.color = b.font_color;
  // outline: imgflip gives outline_color + outline_width (px at font_max_size scale)
  if (b.outline_color) style.stroke = b.outline_color;
  if (b.outline_width != null && b.font_max_size) {
    style.strokeRatio = +(b.outline_width / b.font_max_size).toFixed(3);
  }
  if (b.force_caps === false) style.allCaps = false;
  if (b.text_align && b.text_align !== 'center') style.align = b.text_align;
  if (b.vertical_align && b.vertical_align !== 'middle') style.valign = b.vertical_align;
  if (b.rotation && b.rotation % 360 !== 0) style.rotation = b.rotation;
  if (b.font_max_size) style.maxFontPx = Math.round(b.font_max_size);
  return {
    id,
    x: +(b.x / W).toFixed(4),
    y: +(b.y / H).toFixed(4),
    w: +(b.w / W).toFixed(4),
    h: +(b.h / H).toFixed(4),
    style,
  };
}

async function main() {
  const api = JSON.parse(await fetchText('https://api.imgflip.com/get_memes'));
  const memes = api.data.memes;
  const report = [];

  for (const m of memes) {
    const slug = kebab(m.name);
    if (ONLY && !ONLY.has(slug)) continue;
    const dir = path.join(TEMPLATES_DIR, slug);
    const existing = fs.existsSync(path.join(dir, 'meta.json'))
      ? JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) : null;

    let boxesImg = null;
    try {
      // ID-form URL is canonical/reliable; the name-only form is flaky and can
      // serve a generic page (which caused wrong-template box data).
      const html = await fetchText(`https://imgflip.com/memegenerator/${m.id}/${genSlug(m.name)}`);
      boxesImg = extractDefaultSettings(html, m.name);
    } catch (e) { /* handled below */ }

    if (boxesImg) boxesImg = boxesImg.filter((b) => !b.type || b.type === 'text');

    let boxes, note;
    if (boxesImg && boxesImg.length) {
      const ids = idsFor(slug, boxesImg, existing);
      boxes = boxesImg.map((b, i) => toMetaBox(ids[i], b, m.width, m.height));
      note = 'imgflip';
    } else if (existing?.boxes?.length && !existing.imgflip) {
      // Hand-authored original (no imgflip provenance): keep its tuned boxes.
      boxes = existing.boxes;
      note = 'preserved';
    } else {
      // imgflip's generic fallback: full-width top/bottom Impact boxes.
      boxes = fallbackBoxes(m.box_count);
      note = 'generic';
    }

    const meta = {
      name: m.name,
      file: 'image.jpg',
      imgflip: { id: m.id, url: m.url, width: m.width, height: m.height },
      meaning: existing?.meaning || '',
      when_to_use: existing?.when_to_use || '',
      boxes,
    };

    report.push({ slug, ok: true, note, boxes: boxes.length,
      fonts: [...new Set(boxes.map((b) => b.style?.font || 'Anton'))].join('/'),
      rot: boxes.some((b) => b.style?.rotation) ? 'rot' : '' });

    if (!DRY) {
      fs.mkdirSync(dir, { recursive: true });
      const imgBuf = Buffer.from(await (await fetch(m.url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      fs.writeFileSync(path.join(dir, 'image.jpg'), imgBuf);
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    } else if (ONLY) {
      console.log(`\n--- ${slug} (${m.width}x${m.height}) ---`);
      console.log(JSON.stringify(meta.boxes, null, 2));
    }
    await new Promise((res) => setTimeout(res, 250)); // be polite
  }

  const ok = report.filter((r) => r.ok);
  const byNote = ok.reduce((a, r) => (a[r.note] = (a[r.note] || 0) + 1, a), {});
  console.log(`\n${DRY ? '[DRY] ' : ''}imported ${ok.length}/${report.length} templates  ${JSON.stringify(byNote)}`);
  for (const r of report) {
    console.log(r.ok ? `  OK[${r.note}] ${r.slug}  boxes=${r.boxes} ${r.fonts} ${r.rot}` : `  MISS ${r.slug}  (${r.note})`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
