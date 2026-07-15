// Font registration. We bundle Anton (SIL Open Font License), the open-source
// substitute for Impact used by most web meme generators, so the package is
// legally self-contained. If a user has Impact installed and prefers it, they
// can register it themselves and pass { font: "Impact" }.
//
// imgflip's second-most-common template font is plain "arial" (black text on the
// modern caption-box memes: Woman Yelling at Cat, Drake, Two Buttons, etc.). We
// register the system Arial when present so those render faithfully. If it isn't
// available (headless CI/Linux), calls fall back to Anton so nothing renders blank.
// TODO(portability): bundle Arimo (Apache-2.0, metric-compatible with Arial) so
// the package no longer depends on a system font.
import { GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const antonPath = path.join(here, '..', 'assets', 'fonts', 'Anton-Regular.ttf');

if (!GlobalFonts.has('Anton')) {
  GlobalFonts.registerFromPath(antonPath, 'Anton');
}

// Register a real sans for imgflip's "arial" boxes.
const SANS_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf',
];
export let SANS_FONT = 'Anton'; // fallback if no system sans is found
if (!GlobalFonts.has('Arial')) {
  for (const p of SANS_CANDIDATES) {
    if (fs.existsSync(p)) { GlobalFonts.registerFromPath(p, 'Arial'); SANS_FONT = 'Arial'; break; }
  }
} else {
  SANS_FONT = 'Arial';
}

export const DEFAULT_FONT = 'Anton';

// Map a meta `style.font` to a registered family, degrading gracefully.
export function resolveFont(name) {
  if (!name || name === 'Anton') return 'Anton';
  if (name === 'Arial') return SANS_FONT;
  return GlobalFonts.has(name) ? name : DEFAULT_FONT;
}
