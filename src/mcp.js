#!/usr/bin/env node
// MCP server — exposes the meme library to any AI agent as tools.
//
//   list_templates()            -> every template, its boxes, and what it means
//   get_template(slug)          -> one template's boxes + when-to-use guidance
//   render_meme(slug, captions) -> renders and returns the PNG (and optionally
//                                  writes it to out_path)
//
// The agent workflow is: list_templates to pick a template that fits the joke,
// get_template to see the box ids, render_meme with a caption per box.
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listTemplates, getTemplate, renderMeme } from './index.js';

const server = new McpServer({ name: 'project-five', version: '0.1.0' });

server.tool(
  'list_templates',
  'List every meme template with its box ids and what the meme means. Call this first to choose a template that fits the joke.',
  {},
  async () => ({ content: [{ type: 'text', text: JSON.stringify(listTemplates(), null, 2) }] })
);

server.tool(
  'get_template',
  'Get one template: its box ids, the meaning of the meme, and when to use it. Use the box ids as the keys in render_meme.',
  { slug: z.string().describe('template slug, e.g. "drake-hotline-bling"') },
  async ({ slug }) => {
    try {
      const t = getTemplate(slug);
      const view = { slug, name: t.name, meaning: t.meaning, when_to_use: t.when_to_use, boxes: t.boxes };
      return { content: [{ type: 'text', text: JSON.stringify(view, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  }
);

server.tool(
  'render_meme',
  'Render a meme. Pass a caption for each box id (see get_template). Returns the PNG image; if out_path is given, also writes it there.',
  {
    slug: z.string().describe('template slug'),
    captions: z.record(z.string()).describe('map of box id -> caption text, e.g. {"top":"...","bottom":"..."}'),
    out_path: z.string().optional().describe('optional absolute path to also write the PNG to'),
  },
  async ({ slug, captions, out_path }) => {
    try {
      const { buffer, warnings } = await renderMeme(getTemplate(slug), captions, { format: 'png' });
      const content = [];
      if (out_path) { fs.writeFileSync(out_path, buffer); content.push({ type: 'text', text: `Wrote ${out_path}` }); }
      if (warnings.length) content.push({ type: 'text', text: 'warnings: ' + warnings.join('; ') });
      content.push({ type: 'image', data: buffer.toString('base64'), mimeType: 'image/png' });
      return { content };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  }
);

await server.connect(new StdioServerTransport());
