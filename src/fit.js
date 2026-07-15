// The core "sauce": fit a caption into a bounding box.
// Word-wraps at the widest font size that fits the box width, then shrinks the
// font size until every line also fits the box height. Handles single words
// longer than the box by shrinking until they fit. Returns the chosen font size
// and the wrapped lines, ready to draw.

function wrapLines(ctx, text, maxWidth) {
  // Greedy word wrap. Also hard-breaks a single word that is wider than the box
  // (rare once the font-size search has run, but keeps us from overflowing).
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const trial = current ? current + ' ' + word : word;
    if (ctx.measureText(trial).width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {{w:number,h:number}} box  inner box in px (padding already removed)
 * @param {object} opts { font, maxFontSize, minFontSize, lineHeight }
 * @returns {{ fontSize:number, lines:string[], lineHeight:number, overflow?:boolean }}
 */
export function fitText(ctx, text, box, opts) {
  const font = opts.font;
  const lineHeight = opts.lineHeight ?? 1.02;
  const maxFontSize = Math.max(4, Math.floor(opts.maxFontSize));
  const minFontSize = Math.max(4, Math.floor(opts.minFontSize ?? 10));

  const words = text.split(/\s+/).filter(Boolean);

  for (let size = maxFontSize; size >= minFontSize; size--) {
    ctx.font = `${size}px "${font}"`;
    // The widest single word must fit the box width at this size.
    let longest = 0;
    for (const w of words) longest = Math.max(longest, ctx.measureText(w).width);
    if (longest > box.w) continue;

    const lines = wrapLines(ctx, text, box.w);
    const totalHeight = lines.length * size * lineHeight;
    if (totalHeight <= box.h) {
      return { fontSize: size, lines, lineHeight };
    }
  }

  // Nothing fit cleanly; render at the floor and report overflow so callers can warn.
  const size = minFontSize;
  ctx.font = `${size}px "${font}"`;
  const lines = wrapLines(ctx, text, box.w);
  return { fontSize: size, lines, lineHeight, overflow: true };
}
