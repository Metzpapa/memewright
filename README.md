<div align="center">

# Memery

**The open-source meme engine for AI agents.**

Give it a template and a caption for each box. It renders a clean, correctly
typeset image-macro — right font, proper outline, text that wraps and shrinks to
fit. Drive it from a CLI, an MCP server, or three lines of code.

Memes are one of the highest-performing formats in marketing, and agents can
write the jokes. They just can't *render* them. Memery is the missing hands.

</div>

---

## Why this exists

Ask an AI agent to "make a meme" and it hits a wall: it can write a killer
caption, but it can't place text in the right spot, in the right font, outlined
so it's legible, wrapped so it fits. So agents fall back to describing a meme in
words, or generating a warped image where the text is gibberish.

Memery is the rendering layer. The agent decides *what* the joke is; Memery
handles *how it looks* — pixel-correct, every time. The hard part is not drawing
text on an image. It's the typesetting: fitting an unknown-length caption into a
fixed box, wrapping it, and shrinking the font until it sits perfectly. That's
what Memery does, on a library of templates that each know what they *mean*.

## Quick start

```bash
# no install needed
npx memery list
npx memery make waiting-skeleton \
  --top "me waiting for the cleaner to flag the damage" \
  --bottom "before the next guest checks in" \
  -o meme.png
```

That's a finished, shareable PNG. No watermark, no dragging text boxes.

## Use it from an AI agent (MCP)

Memery ships an [MCP](https://modelcontextprotocol.io) server so any agent
(Claude, Cursor, your own) can make memes as tool calls:

```jsonc
// add to your MCP client config
{
  "mcpServers": {
    "memery": { "command": "npx", "args": ["memery-mcp"] }
  }
}
```

The agent gets three tools:

| Tool | What it does |
|---|---|
| `list_templates` | Every template, its box ids, and **what the meme means** |
| `get_template` | One template's boxes + when-to-use guidance |
| `render_meme` | Render captions into a template; returns the PNG |

The workflow an agent follows: `list_templates` to find a template that fits the
joke → `get_template` to see the box ids → `render_meme` with a caption per box.
The "meaning" metadata is what lets an agent pick the *right* template instead of
forcing every joke into top/bottom text.

## Use it from code

```js
import { makeMeme } from 'memery';
import fs from 'node:fs';

const { buffer } = await makeMeme('drake-hotline-bling', {
  reject: 'driving to every unit to inspect it',
  approve: 'reading the AI report from your phone',
});
fs.writeFileSync('drake.png', buffer);
```

## The template library (the moat)

Every template carries structured metadata, not just an image:

```jsonc
{
  "name": "Woman Yelling at Cat",
  "meaning": "A furious accusation (left) met with total, smug indifference (right).",
  "when_to_use": "woman = the angry complaint; cat = the unbothered reply.",
  "boxes": [
    { "id": "woman", "x": 0.02, "y": 0.03, "w": 0.46, "h": 0.22 },
    { "id": "cat",   "x": 0.52, "y": 0.03, "w": 0.46, "h": 0.22 }
  ]
}
```

Box coordinates are fractions of the image, so a template renders identically at
any resolution. The `meaning` and `when_to_use` fields are the real product: they
turn a folder of images into something an agent can *reason* about.

16 templates today. The roadmap is a larger, richer library plus **trending
meme** data — the formats that are hot this week, which is what makes meme
marketing actually land.

## How the text fitting works

For each caption, Memery finds the largest font size at which the text both wraps
inside the box width *and* fits the box height, shrinking the font (and
hard-wrapping over-long words) until it does. White fill, black outline, all-caps
by default — the image-macro standard — with per-box overrides for panels that
need dark text on light backgrounds (Drake, Expanding Brain, UNO).

Fonts: Memery bundles [Anton](https://fonts.google.com/specimen/Anton) (SIL Open
Font License), the open substitute for Impact, so the package is legally
self-contained. Have Impact and prefer it? Register it and pass `{ font: "Impact" }`.

## Self-host / hosted

Memery is AGPL-3.0 and fully self-hostable — the CLI, the MCP server, and the
library are the whole thing; run them anywhere Node runs. A hosted cloud (web
editor, brand kits, auto-posting, the trending-meme database) is the planned
commercial layer, but the engine is and stays open source.

## License

[AGPL-3.0-or-later](./LICENSE). Bundled font: Anton, SIL OFL (see
`assets/fonts/OFL.txt`).
