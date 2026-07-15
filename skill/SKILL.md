---
name: memery
description: Make a real, shareable meme image. Use when the user wants a meme, an image-macro, or a funny visual for marketing/social — anything where a caption goes on a known meme template (Drake, Distracted Boyfriend, Woman Yelling at Cat, etc.). Renders a finished PNG with correct font, outline, and text fitting.
---

# Making memes with Memery

Memery renders finished meme images from a template + a caption per box. You
write the joke; Memery handles the typesetting. Do NOT try to draw memes with an
image model — the text comes out warped. Use this tool.

## The loop

1. **Pick a template by meaning, not by shape.** List the templates and read each
   one's `meaning` / `when_to_use`. Choose the template whose *structure* matches
   the joke (a preference → Drake; an accusation met with indifference → Woman
   Yelling at Cat; a thing that never happens → Waiting Skeleton). Forcing every
   joke into top/bottom text is the #1 mistake.

   ```bash
   npx memery list --json
   npx memery info drake-hotline-bling --json
   ```

2. **Write a caption for each box id.** Keep captions short and punchy — meme
   text is 3-8 words per box. All-caps is applied automatically.

3. **Render.**

   ```bash
   npx memery make drake-hotline-bling \
     --set reject="writing the caption yourself" \
     --set approve="letting memery render it" \
     -o meme.png
   ```

   Or pass all captions as JSON:

   ```bash
   npx memery make woman-yelling-at-cat \
     --captions '{"woman":"you said it was done","cat":"the ci that failed 3 minutes ago"}' \
     -o meme.png
   ```

## If you have MCP access

Prefer the MCP tools when available — they return the image directly:
`list_templates` → `get_template` → `render_meme({ slug, captions, out_path })`.

## Rules that make memes land

- **Match the template to the joke's structure.** Read `meaning` first.
- **Short captions.** If a caption needs a sentence, the template is wrong.
- **Two options? Use a two-option template** (Drake, Two Buttons, Left Exit).
  **A smug comeback? Woman Yelling at Cat.** **Escalating list? Expanding Brain.**
- Don't explain the joke in the caption. The image carries half of it.
- For business/marketing memes, the punchline should be an in-group truth the
  target audience feels — specificity beats broad relatability.
