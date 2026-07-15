// Programmatic API.
//
//   import { makeMeme, listTemplates } from 'project-five';
//   const { buffer } = await makeMeme('waiting-skeleton', {
//     top: 'me waiting for the cleaner to flag the damage',
//     bottom: 'before the next guest checks in',
//   });
//   fs.writeFileSync('out.png', buffer);

import { getTemplate, listTemplates } from './templates.js';
import { renderMeme } from './render.js';

export { listTemplates, getTemplate, renderMeme };

/**
 * Render a bundled template by slug.
 * @param {string} slug
 * @param {object|Array} captions  map of boxId -> text (or array in box order)
 * @param {object} [opts] { format, quality }
 */
export async function makeMeme(slug, captions, opts) {
  const template = getTemplate(slug);
  return renderMeme(template, captions, opts);
}
