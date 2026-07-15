// Seeds the template library: copies each source image into templates/<slug>/
// and writes its meta.json (bounding boxes + the "meaning" data). Box coords are
// fractions of the image (0..1) so they are resolution-independent. Styles:
//   default = white fill + black stroke, all-caps, centered  (top/bottom captions)
//   black   = black fill, no stroke                          (captions on light panels)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(process.env.HOME, 'Downloads', 'meme-templates');
const OUT = path.join(here, '..', 'templates');

const BLACK = { color: '#000000', stroke: null, allCaps: true };

const T = {
  'waiting-skeleton': {
    src: 'Waiting-Skeleton.jpg', name: 'Waiting Skeleton',
    meaning: 'Waiting so long that you died and decomposed. For a thing you will wait on indefinitely, or that never comes. The humor is futility, not a short delay.',
    when_to_use: 'Setup names something you are "still waiting" for that chronically never happens.',
    boxes: [
      { id: 'top', x: 0.04, y: 0.015, w: 0.92, h: 0.20, style: { valign: 'top' } },
      { id: 'bottom', x: 0.04, y: 0.78, w: 0.92, h: 0.20, style: { valign: 'bottom' } },
    ],
  },
  'x-x-everywhere': {
    src: 'X-X-Everywhere.jpg', name: 'X, X Everywhere',
    meaning: 'Buzz shows Woody that a thing is absolutely everywhere. For something so pervasive you cannot escape it.',
    when_to_use: 'Top = the thing; bottom = "[thing] everywhere". Works for anything ubiquitous or inescapable.',
    boxes: [
      { id: 'top', x: 0.04, y: 0.03, w: 0.92, h: 0.15, style: { valign: 'top' } },
      { id: 'bottom', x: 0.04, y: 0.80, w: 0.92, h: 0.16, style: { valign: 'bottom' } },
    ],
  },
  'one-does-not-simply': {
    src: 'One-Does-Not-Simply.jpg', name: 'One Does Not Simply',
    meaning: 'Boromir: "One does not simply walk into Mordor." For a task everyone underestimates that is actually very hard.',
    when_to_use: 'Top = "one does not simply"; bottom = the deceptively hard task.',
    boxes: [
      { id: 'top', x: 0.04, y: 0.02, w: 0.92, h: 0.22, style: { valign: 'top' } },
      { id: 'bottom', x: 0.04, y: 0.74, w: 0.92, h: 0.24, style: { valign: 'bottom' } },
    ],
  },
  'disaster-girl': {
    src: 'Disaster-Girl.jpg', name: 'Disaster Girl',
    meaning: 'A little girl smirks as a house burns behind her. For quietly enjoying chaos you caused or set in motion.',
    when_to_use: 'Top = the disaster/chaos; bottom = you, the smug cause. Or a single top caption.',
    boxes: [
      { id: 'top', x: 0.04, y: 0.02, w: 0.92, h: 0.20, style: { valign: 'top' } },
      { id: 'bottom', x: 0.04, y: 0.80, w: 0.92, h: 0.18, style: { valign: 'bottom' } },
    ],
  },
  'mocking-spongebob': {
    src: 'Mocking-Spongebob.jpg', name: 'Mocking SpongeBob',
    meaning: 'SpongeBob in a mocking chicken pose. The caption is written in aLtErNaTiNg CaPs to mock something someone said.',
    when_to_use: 'Bottom caption is the thing being mocked. Type it in alternating caps yourself for the effect.',
    boxes: [
      { id: 'top', x: 0.04, y: 0.02, w: 0.92, h: 0.16, style: { valign: 'top' } },
      { id: 'bottom', x: 0.04, y: 0.80, w: 0.92, h: 0.18, style: { valign: 'bottom' } },
    ],
  },
  'drake-hotline-bling': {
    src: 'Drake-Hotline-Bling.jpg', name: 'Drake Hotline Bling',
    meaning: 'Drake rejects the top option (hand up, disgust) and prefers the bottom option (pointing, approval). For preferring one thing over another.',
    when_to_use: 'reject = the worse option; approve = the better option. Text sits on the right half.',
    boxes: [
      { id: 'reject', x: 0.50, y: 0.02, w: 0.48, h: 0.46, style: { ...BLACK, valign: 'middle' } },
      { id: 'approve', x: 0.50, y: 0.52, w: 0.48, h: 0.46, style: { ...BLACK, valign: 'middle' } },
    ],
  },
  'two-buttons': {
    src: 'Two-Buttons.jpg', name: 'Two Buttons',
    meaning: 'A sweating man agonizes over two buttons he cannot choose between. For an impossible or self-contradictory choice.',
    when_to_use: 'button1 and button2 are two options that are hard to choose between (often contradictory). label = the sweating decider (bottom).',
    boxes: [
      { id: 'button1', x: 0.10, y: 0.055, w: 0.34, h: 0.10, style: { ...BLACK, valign: 'middle' } },
      { id: 'button2', x: 0.40, y: 0.155, w: 0.34, h: 0.10, style: { ...BLACK, valign: 'middle' } },
      { id: 'label', x: 0.04, y: 0.86, w: 0.92, h: 0.12, style: { valign: 'bottom' } },
    ],
  },
  'change-my-mind': {
    src: 'Change-My-Mind.jpg', name: 'Change My Mind',
    meaning: 'A man at a table with a sign inviting debate. For stating a controversial or cheeky opinion as settled fact.',
    when_to_use: 'sign = the hot take. Text sits on the sign in dark type.',
    boxes: [
      { id: 'sign', x: 0.30, y: 0.60, w: 0.44, h: 0.22, style: { ...BLACK, valign: 'middle' } },
    ],
  },
  'batman-slapping-robin': {
    src: 'Batman-Slapping-Robin.jpg', name: 'Batman Slapping Robin',
    meaning: 'Robin starts to say something and Batman slaps him mid-sentence. For shutting down a bad take immediately.',
    when_to_use: 'robin = the naive/wrong statement (left); batman = the slapping correction (right).',
    boxes: [
      { id: 'robin', x: 0.03, y: 0.04, w: 0.42, h: 0.44 },
      { id: 'batman', x: 0.52, y: 0.04, w: 0.44, h: 0.44 },
    ],
  },
  'uno-draw-25-cards': {
    src: 'UNO-Draw-25-Cards.jpg', name: 'UNO Draw 25 Cards',
    meaning: 'An UNO card offers a choice: do the thing, or draw 25 cards. The person holds a massive fan of cards, having refused. For refusing a simple ask so hard you take an absurd penalty.',
    when_to_use: 'card = "[do simple thing] or draw 25" (dark text on the card, left). person = who would rather take the L (top-right).',
    boxes: [
      { id: 'card', x: 0.04, y: 0.10, w: 0.40, h: 0.40, style: { ...BLACK, valign: 'middle' } },
      { id: 'person', x: 0.50, y: 0.02, w: 0.48, h: 0.22, style: { valign: 'top' } },
    ],
  },
  'left-exit-12-off-ramp': {
    src: 'Left-Exit-12-Off-Ramp.jpg', name: 'Left Exit 12 Off Ramp',
    meaning: 'A car swerves hard across lines to take an exit at the last second. For abandoning the sensible path for a tempting bad one.',
    when_to_use: 'straight = the sensible option (left sign); exit = the tempting option being swerved toward (right sign); car = the decider (bottom).',
    boxes: [
      { id: 'straight', x: 0.05, y: 0.05, w: 0.36, h: 0.16 },
      { id: 'exit', x: 0.55, y: 0.05, w: 0.36, h: 0.16 },
      { id: 'car', x: 0.30, y: 0.80, w: 0.40, h: 0.14, style: { valign: 'bottom' } },
    ],
  },
  'distracted-boyfriend': {
    src: 'Distracted-Boyfriend.jpg', name: 'Distracted Boyfriend',
    meaning: 'A man walking with his girlfriend turns to check out another woman. For being tempted away from what you have by something new.',
    when_to_use: 'boyfriend = you/the tempted party (center); girlfriend = the current thing (right); other_woman = the tempting new thing (left).',
    boxes: [
      { id: 'other_woman', x: 0.02, y: 0.55, w: 0.26, h: 0.16 },
      { id: 'boyfriend', x: 0.40, y: 0.42, w: 0.30, h: 0.16 },
      { id: 'girlfriend', x: 0.73, y: 0.46, w: 0.25, h: 0.16 },
    ],
  },
  'expanding-brain': {
    src: 'Expanding-Brain.jpg', name: 'Expanding Brain',
    meaning: 'Four stacked panels: a brain glows brighter/bigger with each row, mock-signaling escalating "enlightenment". For an escalating list where each step is (ironically) presented as smarter.',
    when_to_use: 'level1..level4 escalate from basic to absurd/galaxy-brained. Text on the dark left panels.',
    boxes: [
      { id: 'level1', x: 0.02, y: 0.00, w: 0.50, h: 0.25, style: { valign: 'middle' } },
      { id: 'level2', x: 0.02, y: 0.25, w: 0.50, h: 0.25, style: { valign: 'middle' } },
      { id: 'level3', x: 0.02, y: 0.50, w: 0.50, h: 0.25, style: { valign: 'middle' } },
      { id: 'level4', x: 0.02, y: 0.75, w: 0.50, h: 0.25, style: { valign: 'middle' } },
    ],
  },
  'running-away-balloon': {
    src: 'Running-Away-Balloon.jpg', name: 'Running Away Balloon',
    meaning: 'A person reaches longingly for a balloon floating away. Labeled balloons/figures represent what someone wants versus what holds them back.',
    when_to_use: 'want = the balloon drifting away (top); person = who reaches for it (bottom-left). Simple two-label version.',
    boxes: [
      { id: 'want', x: 0.48, y: 0.04, w: 0.48, h: 0.14, style: { valign: 'top' } },
      { id: 'person', x: 0.04, y: 0.80, w: 0.46, h: 0.16, style: { valign: 'bottom' } },
    ],
  },
  'woman-yelling-at-cat': {
    src: 'Woman-Yelling-At-Cat.jpg', name: 'Woman Yelling at Cat',
    meaning: 'Left: a woman screams and points, furious. Right: a white cat (Smudge) sits at a dinner plate looking smug and unbothered. For an accusation met with total, blase indifference.',
    when_to_use: 'woman = the angry accusation/complaint (left panel); cat = the smug, unbothered reply (right panel).',
    boxes: [
      { id: 'woman', x: 0.02, y: 0.03, w: 0.46, h: 0.22, style: { valign: 'top' } },
      { id: 'cat', x: 0.52, y: 0.03, w: 0.46, h: 0.22, style: { valign: 'top' } },
    ],
  },
  'boardroom-meeting-suggestion': {
    src: 'Boardroom-Meeting-Suggestion.jpg', name: 'Boardroom Meeting Suggestion',
    meaning: 'A boss asks a room for ideas; after two reasonable answers, the third person gives a blunt truth and gets thrown out the window. For a truth nobody wants to hear.',
    when_to_use: 'prompt = the boss question (top). r1, r2 = safe answers. r3 = the blunt truth that gets you defenestrated.',
    boxes: [
      { id: 'prompt', x: 0.06, y: 0.01, w: 0.88, h: 0.10, style: { valign: 'top' } },
      { id: 'r1', x: 0.30, y: 0.40, w: 0.22, h: 0.09, style: { ...BLACK, valign: 'middle' } },
      { id: 'r2', x: 0.06, y: 0.55, w: 0.22, h: 0.09, style: { ...BLACK, valign: 'middle' } },
      { id: 'r3', x: 0.30, y: 0.55, w: 0.22, h: 0.09, style: { ...BLACK, valign: 'middle' } },
    ],
  },
};

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [slug, def] of Object.entries(T)) {
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const srcImg = path.join(SRC, def.src);
  if (fs.existsSync(srcImg)) fs.copyFileSync(srcImg, path.join(dir, 'image.jpg'));
  else console.warn(`  ! missing source image: ${def.src}`);
  const meta = {
    name: def.name,
    file: 'image.jpg',
    meaning: def.meaning,
    when_to_use: def.when_to_use,
    boxes: def.boxes,
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  n++;
}
console.log(`Seeded ${n} templates into ${OUT}`);
