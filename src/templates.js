import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.join(here, '..', 'templates');

function readMeta(slug) {
  const dir = path.join(TEMPLATES_DIR, slug);
  const metaPath = path.join(dir, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const image = path.join(dir, meta.file || 'image.jpg');
  return { ...meta, slug, image };
}

/** List every bundled template with its metadata (no image loaded). */
export function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs.readdirSync(TEMPLATES_DIR)
    .filter((d) => fs.existsSync(path.join(TEMPLATES_DIR, d, 'meta.json')))
    .map((slug) => {
      const m = readMeta(slug);
      return {
        slug: m.slug,
        name: m.name,
        boxes: m.boxes.map((b) => b.id),
        meaning: m.meaning,
        when_to_use: m.when_to_use,
      };
    });
}

/** Get one template fully resolved, including the absolute image path. */
export function getTemplate(slug) {
  const dir = path.join(TEMPLATES_DIR, slug);
  if (!fs.existsSync(path.join(dir, 'meta.json'))) {
    throw new Error(`Unknown template "${slug}". Run \`listTemplates()\` to see options.`);
  }
  return readMeta(slug);
}
