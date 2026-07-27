#!/usr/bin/env node
// CLI. Designed to be trivially drivable by a human OR an AI agent.
//
//   memewright list [--json]
//   memewright info <slug> [--json]
//   memewright make <slug> --top "..." --bottom "..." -o out.png
//   memewright make <slug> --set reject="..." --set approve="..." -o out.png
//   memewright make <slug> --captions '{"top":"...","bottom":"..."}' -o out.png
//
// `list` and `info` emit JSON with --json so an agent can discover templates,
// their boxes, and what each meme means before rendering.
import fs from 'node:fs';
import { listTemplates, getTemplate, renderMeme } from './index.js';

function parseArgs(argv) {
  const args = { _: [], set: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--jpeg' || a === '--jpg') args.jpeg = true;
    else if (a === '-o' || a === '--out') args.out = argv[++i];
    else if (a === '--top') args.set.top = argv[++i];
    else if (a === '--bottom') args.set.bottom = argv[++i];
    else if (a === '--captions') args.captions = argv[++i];
    else if (a === '--scale') args.scale = Number(argv[++i]) || 1;
    else if (a === '--set') {
      const kv = argv[++i] || '';
      const eq = kv.indexOf('=');
      if (eq > 0) args.set[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (a === '--image') {
      // path@x,y,w[,rotation][,opacity][,under]   coords are fractions 0..1
      const spec = argv[++i] || '';
      const at = spec.lastIndexOf('@');
      const src = at >= 0 ? spec.slice(0, at) : spec;
      const parts = (at >= 0 ? spec.slice(at + 1) : '').split(',');
      const under = parts.includes('under');
      const n = parts.filter((p) => p !== 'under').map(Number);
      (args.images ||= []).push({
        src, x: n[0] ?? 0.70, y: n[1] ?? 0.70, w: n[2] ?? 0.25,
        rotation: n[3] || 0, opacity: n[4] ?? 1, layer: under ? 'under' : 'over',
      });
    } else args._.push(a);
  }
  return args;
}

function die(msg, code = 1) { console.error(msg); process.exit(code); }

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`memewright — render memes from templates + captions

Commands:
  list [--json]                 List templates (slug, boxes, meaning)
  info <slug> [--json]          Show a template's boxes and meaning
  make <slug> [caption opts]    Render a meme

Caption options for \`make\`:
  --top "text"                  Fill the "top" box
  --bottom "text"               Fill the "bottom" box
  --set id="text"               Fill any box by id (repeatable)
  --captions '{"id":"text"}'    Fill boxes from a JSON object
  -o, --out <file>              Output path (default: stdout)
  --jpeg                        Encode JPEG instead of PNG
  --image path@x,y,w[,rot][,op][,under]
                                Overlay a logo/sticker (coords are fractions 0..1;
                                x,y = top-left, w = width. 'under' = behind text).
                                Repeatable.

Examples:
  memewright list --json
  memewright info drake-hotline-bling
  memewright make waiting-skeleton --top "me waiting" --bottom "for the fix" -o out.png`);
  process.exit(0);
}

if (cmd === 'list') {
  const list = listTemplates();
  if (args.json) { console.log(JSON.stringify(list, null, 2)); process.exit(0); }
  for (const t of list) console.log(`${t.slug.padEnd(30)} boxes: ${t.boxes.join(', ')}`);
  process.exit(0);
}

if (cmd === 'info') {
  const slug = args._[0];
  if (!slug) die('usage: memewright info <slug>');
  let t;
  try { t = getTemplate(slug); } catch (e) { die(e.message); }
  const view = { slug, name: t.name, meaning: t.meaning, when_to_use: t.when_to_use, ...(t.baked_in_text ? { baked_in_text: t.baked_in_text } : {}), boxes: t.boxes };
  if (args.json) { console.log(JSON.stringify(view, null, 2)); process.exit(0); }
  console.log(`${t.name} (${slug})\n\n${t.meaning}\n\nWhen to use: ${t.when_to_use}${t.baked_in_text ? `\n\nBaked-in text: ${t.baked_in_text}` : ''}\n\nBoxes:`);
  for (const b of t.boxes) console.log(`  ${b.id}`);
  process.exit(0);
}

if (cmd === 'make') {
  const slug = args._[0];
  if (!slug) die('usage: memewright make <slug> [caption opts] -o out.png');
  let captions = { ...args.set };
  if (args.captions) {
    try { captions = { ...JSON.parse(args.captions), ...captions }; }
    catch { die('--captions must be valid JSON'); }
  }
  if (Object.keys(captions).length === 0) die('no captions given; see `memewright info ' + slug + '`');

  let result;
  try { result = await renderMeme(getTemplate(slug), captions, { format: args.jpeg ? 'jpeg' : 'png', images: args.images, scale: args.scale }); }
  catch (e) { die(e.message); }

  for (const w of result.warnings) console.error('warning: ' + w);
  if (args.out) { fs.writeFileSync(args.out, result.buffer); console.error(`wrote ${args.out} (${result.buffer.length} bytes)`); }
  else process.stdout.write(result.buffer);
  process.exit(0);
}

die(`unknown command "${cmd}". Run \`memewright help\`.`);
