#!/usr/bin/env node
// Minimal self-hostable HTTP server: a JSON template API, a /render endpoint,
// and the static browser playground. No web framework — Node built-ins only.
//
//   npx memewright-server          # then open http://localhost:8787
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates, getTemplate, renderMeme } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(here, '..', 'web');
const PORT = process.env.PORT || 8787;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function send(res, code, type, body) {
  res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/api/templates') {
      return send(res, 200, 'application/json', JSON.stringify(listTemplates()));
    }
    if (url.pathname === '/api/template') {
      const t = getTemplate(url.searchParams.get('slug'));
      return send(res, 200, 'application/json',
        JSON.stringify({ slug: t.slug, name: t.name, meaning: t.meaning, when_to_use: t.when_to_use, boxes: t.boxes }));
    }
    if (url.pathname === '/api/render' && req.method === 'POST') {
      const { slug, captions } = await readJson(req);
      const { buffer } = await renderMeme(getTemplate(slug), captions || {}, { format: 'png' });
      return send(res, 200, 'image/png', buffer);
    }

    // static playground
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    const full = path.join(WEB, path.normalize(file));
    if (full.startsWith(WEB) && fs.existsSync(full)) {
      return send(res, 200, MIME[path.extname(full)] || 'application/octet-stream', fs.readFileSync(full));
    }
    send(res, 404, 'text/plain', 'not found');
  } catch (e) {
    send(res, 400, 'application/json', JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`Memewright playground on http://localhost:${PORT}`));
