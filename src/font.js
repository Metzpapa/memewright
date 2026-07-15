// Font registration. We bundle Anton (SIL Open Font License), the open-source
// substitute for Impact used by most web meme generators, so the package is
// legally self-contained. If a user has Impact installed and prefers it, they
// can register it themselves and pass { font: "Impact" }.
import { GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const antonPath = path.join(here, '..', 'assets', 'fonts', 'Anton-Regular.ttf');

if (!GlobalFonts.has('Anton')) {
  GlobalFonts.registerFromPath(antonPath, 'Anton');
}

export const DEFAULT_FONT = 'Anton';
