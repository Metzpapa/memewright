import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeMeme, listTemplates } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'examples');
fs.mkdirSync(outDir, { recursive: true });

console.log('Templates:', listTemplates().map((t) => t.slug).join(', '));

const cases = [
  {
    name: 'skeleton-short',
    slug: 'waiting-skeleton',
    captions: { top: 'me waiting for the cleaner to flag the damage', bottom: 'before the next guest checks in' },
  },
  {
    name: 'skeleton-long',
    slug: 'waiting-skeleton',
    captions: { top: 'me waiting for the guest to voluntarily self-report the enormous red wine stain they left on the white sofa', bottom: '' },
  },
];

for (const c of cases) {
  const { buffer, warnings } = await makeMeme(c.slug, c.captions, { format: 'png' });
  const out = path.join(outDir, `${c.name}.png`);
  fs.writeFileSync(out, buffer);
  console.log(`wrote ${out} (${buffer.length} bytes)${warnings.length ? ' warnings: ' + warnings.join('; ') : ''}`);
}
