/**
 * `npm run art:placeholders`: paint a placeholder PNG for every art asset.
 *
 * Painted in headless Chromium (Playwright is already a dev dependency) on a
 * canvas, because a placeholder here has to carry a big readable name and an
 * emoji glyph, and Node has no font rasteriser without an image library.
 *
 * **Never overwrites real art.** Every PNG this writes carries a tEXt chunk
 * `WordWarriors=placeholder`. A file without that chunk is somebody's art and is
 * skipped, loudly. A file with it is repainted, so changing a palette in the
 * roster and re-running updates the placeholders. `--missing` paints only
 * absent files.
 *
 * Also writes docs/art.md, the brief for writing AI image prompts, from the
 * same list (content/art/assets.ts).
 */

import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

import { ART_ASSETS, type ArtAsset } from '../../content/art/assets.js';
import { ART_DIR, blankPage, exists, fromDataUrl, isBackgroundKind, runMain, SPRITE_SCALE } from '../shared.js';

const MARK_KEY = 'WordWarriors';
const MARK_VALUE = 'placeholder';

// -- PNG tEXt chunk -----------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Insert a tEXt chunk straight after IHDR (8-byte signature + 25-byte IHDR). */
function withMark(png: Buffer): Buffer {
  const data = Buffer.from(`${MARK_KEY}\0${MARK_VALUE}`, 'latin1');
  const type = Buffer.from('tEXt', 'latin1');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const at = 8 + 25;
  return Buffer.concat([png.subarray(0, at), len, type, data, crc, png.subarray(at)]);
}

export function isPlaceholder(png: Buffer): boolean {
  return png.includes(Buffer.from(`tEXt${MARK_KEY}\0${MARK_VALUE}`, 'latin1'));
}

// -- painting (runs inside the page) ------------------------------------------

/** An asset to paint, with what the page cannot import worked out in Node (`tools/shared.ts`). */
type PaintJob = ArtAsset & { background: boolean; scale: number };

function paintAll(list: PaintJob[]): Record<string, string> {
  const hex = (n: number, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  const shade = (n: number, f: number) => {
    const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  const out: Record<string, string> = {};

  for (const a of list) {
    const scale = a.scale;
    const W = a.w * scale;
    const H = a.h * scale;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    // Round joins, or a thick text outline grows miter spikes off every M and A.
    g.lineJoin = 'round';
    const [c1, c2] = a.palette ?? [0xffffff, 0xdddddd];

    const fitText = (text: string, maxW: number, size: number, font = 'bold') => {
      let s = size;
      g.font = `${font} ${s}px "Arial Black", "Segoe UI", sans-serif`;
      while (g.measureText(text).width > maxW && s > 8) {
        s -= 2;
        g.font = `${font} ${s}px "Arial Black", "Segoe UI", sans-serif`;
      }
      return s;
    };
    const emoji = (glyph: string, x: number, y: number, size: number) => {
      g.font = `${size}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(glyph, x, y);
    };
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };

    if (a.kind === 'character' || a.kind === 'minion' || a.kind === 'item') {
      const evil = Boolean(a.evil);
      const pad = 10 * scale;
      // Spiky border for evil versions; a soft rounded card for everyone else.
      if (evil) {
        g.beginPath();
        const spikes = 28;
        const cx = W / 2;
        const cy = H / 2;
        for (let i = 0; i <= spikes * 2; i++) {
          const t = (i / (spikes * 2)) * Math.PI * 2;
          const r = i % 2 === 0 ? 1 : 0.9;
          const x = cx + Math.cos(t) * (W / 2) * r;
          const y = cy + Math.sin(t) * (H / 2) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fillStyle = hex(0x120012);
        g.fill();
        g.strokeStyle = hex(0xff2244);
        g.lineWidth = 4 * scale;
        g.stroke();
      }
      const inset = evil ? W * 0.13 : pad;
      const insetY = evil ? H * 0.13 : pad;
      roundRect(inset, insetY, W - inset * 2, H - insetY * 2, 22 * scale);
      const grad = g.createLinearGradient(0, insetY, 0, H - insetY);
      grad.addColorStop(0, hex(evil ? shade(c1, 0.7) : shade(c1, 1.15)));
      grad.addColorStop(1, hex(evil ? shade(c1, 0.35) : c1));
      g.fillStyle = grad;
      g.fill();
      g.lineWidth = 6 * scale;
      g.strokeStyle = hex(evil ? 0xff2244 : c2);
      g.stroke();

      const glyphSize = (a.kind === 'character' ? Math.min(W, H) * 0.42 : Math.min(W, H) * 0.5);
      // A card with no label (the name-free face cards) centres its glyph, larger.
      if (a.glyph) emoji(a.glyph, W / 2, !a.label ? H * 0.52 : a.kind === 'character' ? H * 0.42 : H * 0.44, !a.label ? glyphSize * 1.35 : glyphSize);

      const label = a.label ?? '';
      if (label) {
        const maxW = W - inset * 2 - 12 * scale;
        const size = fitText(label, maxW, (a.kind === 'character' ? 34 : 22) * scale);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const ly = a.kind === 'character' ? H * 0.8 : H * 0.83;
        g.lineWidth = Math.max(4, size * 0.18);
        g.strokeStyle = hex(0x000000, 0.85);
        g.strokeText(label, W / 2, ly);
        g.fillStyle = hex(0xffffff);
        g.fillText(label, W / 2, ly);
        if (evil) {
          const es = 26 * scale;
          g.font = `bold ${es}px "Arial Black", sans-serif`;
          g.lineWidth = 6 * scale;
          g.strokeStyle = hex(0x000000);
          g.strokeText('EVIL', W / 2, H * 0.2);
          g.fillStyle = hex(0xff2244);
          g.fillText('EVIL', W / 2, H * 0.2);
        }
      }
    } else if (a.background) {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, hex(c1));
      sky.addColorStop(1, hex(c2));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      if (a.kind === 'arena') {
        // Rolling hills on the horizon, then a flat floor for the fighters.
        const far = hex(shade(c2, 0.7), 0.55);
        const hz = H * 0.46;
        g.fillStyle = far;
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.ellipse((i + 0.5) * (W / 5), hz + 10, W * 0.16, H * 0.16, 0, Math.PI, 0);
          g.fill();
        }
        const floor = g.createLinearGradient(0, H * 0.42, 0, H);
        const gr = a.ground ?? shade(c2, 0.55);
        floor.addColorStop(0, hex(shade(gr, 1.05)));
        floor.addColorStop(1, hex(shade(gr, 0.62)));
        g.fillStyle = floor;
        g.fillRect(0, H * 0.45, W, H * 0.55);
      } else {
        // Rooms: a back wall in the first colour with a window, a skirting
        // board, and a floor in the second colour across the lower half.
        const fy = H * 0.5;
        g.fillStyle = hex(shade(c1, 1.1));
        g.fillRect(0, 0, W, fy);
        g.fillStyle = hex(0xffffff, 0.08);
        for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, fy);
        const wx = W * 0.4;
        g.fillStyle = hex(shade(c1, 0.55));
        roundRect(wx - 8, H * 0.1 - 8, 196, 156, 14);
        g.fill();
        const skyG = g.createLinearGradient(0, H * 0.1, 0, H * 0.1 + 140);
        skyG.addColorStop(0, hex(0x8ad7ff));
        skyG.addColorStop(1, hex(0xd8f4ff));
        g.fillStyle = skyG;
        roundRect(wx, H * 0.1, 180, 140, 10);
        g.fill();
        g.fillStyle = hex(shade(c1, 0.55));
        g.fillRect(wx + 86, H * 0.1, 8, 140);
        g.fillRect(wx, H * 0.1 + 66, 180, 8);
        g.fillStyle = hex(shade(c1, 0.5));
        g.fillRect(0, fy - 16, W, 16);
        const floor = g.createLinearGradient(0, fy, 0, H);
        floor.addColorStop(0, hex(shade(c2, 1.05)));
        floor.addColorStop(1, hex(shade(c2, 0.7)));
        g.fillStyle = floor;
        g.fillRect(0, fy, W, H - fy);
        // Floorboards, and a rug where the middle of the room is.
        g.strokeStyle = hex(0x000000, 0.12);
        g.lineWidth = 3;
        for (let y = fy + 30; y < H; y += 36) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(W, y);
          g.stroke();
        }
        g.fillStyle = hex(shade(c1, 0.85), 0.35);
        g.beginPath();
        g.ellipse(W / 2, H * 0.78, W * 0.28, H * 0.12, 0, 0, Math.PI * 2);
        g.fill();
      }
      if (a.glyph) {
        g.globalAlpha = a.kind === 'arena' ? 0.12 : 0.22;
        for (let i = 0; i < 7; i++) emoji(a.glyph, (i + 0.5) * (W / 7), H * (0.18 + (i % 2) * 0.1), 70);
        g.globalAlpha = 1;
      }
      if (a.label) {
        g.font = 'bold 28px "Arial Black", sans-serif';
        g.textAlign = 'right';
        g.textBaseline = 'bottom';
        g.fillStyle = hex(0xffffff, 0.35);
        g.fillText(a.label, W - 16, H - 12);
      }
    } else if (a.kind === 'picture') {
      roundRect(6 * scale, 6 * scale, W - 12 * scale, H - 12 * scale, 24 * scale);
      g.fillStyle = hex(0xfffaf0);
      g.fill();
      g.lineWidth = 6 * scale;
      g.strokeStyle = hex(0x5a4a8a);
      g.stroke();
      // A word with no emoji (Windows 10's font lacks some) gets a framed-picture stand-in.
      emoji(a.glyph || '🖼️', W / 2, H / 2 + 6 * scale, W * 0.62);
    } else {
      // Props: the glyph, or a sparkle where there is none.
      emoji(a.glyph || '✨', W / 2, H / 2, Math.min(W, H) * 0.85);
    }

    out[a.id] = cv.toDataURL('image/png');
  }
  return out;
}

// -- docs/art.md ---------------------------------------------------------------

function artDoc(): string {
  const kinds: [ArtAsset['kind'], string][] = [
    ['character', 'Characters (good and evil versions)'],
    ['minion', 'Summoned minions and helpers'],
    ['arena', 'Battle arenas'],
    ['room', 'Rooms (the house, episode screens and minigames)'],
    ['picture', 'Word pictures'],
    ['item', 'Counter items'],
    ['prop', 'Props, house objects (`obj_`), villain decals (`decal_`) and effects'],
  ];
  const out: string[] = [
    '# Art assets',
    '',
    'Generated by `npm run art:placeholders` from `content/art/assets.ts`. Do not edit by hand.',
    '',
    'Every asset is `public/art/<id>.png`; the game fits the image into the display size below,',
    'keeping its aspect ratio. Transparent PNG for everything except arenas and rooms. Real art',
    'comes from `npm run art:gen`, or `art:alts` then `art:pick` (README, *Real art*), which cut,',
    'key, fit and shrink it from an original kept in `art-originals/`; never copy a file in by',
    'hand. The placeholder painter never overwrites a file it did not paint (it marks its own',
    'with a PNG text chunk).',
    '',
    'House style for prompts: bright, friendly cartoon for a 4-year-old; villains mischievous,',
    'never frightening; Elsa, Anna and Jasmine are original designs, not lookalikes.',
    'Word pictures must contain no text or letters: the word is the reading answer.',
    '',
  ];
  for (const [kind, title] of kinds) {
    out.push(`## ${title}`, '', '| id | size | content |', '| --- | --- | --- |');
    for (const a of ART_ASSETS.filter((x) => x.kind === kind)) out.push(`| \`${a.id}\` | ${a.w}×${a.h} | ${a.content.replace(/\|/g, '/')} |`);
    out.push('');
  }
  return out.join('\n');
}

// -- main ----------------------------------------------------------------------

async function paintPlaceholders(argv: string[]): Promise<void> {
  const onlyMissing = argv.includes('--missing');
  await mkdir(ART_DIR, { recursive: true });

  const todo: PaintJob[] = [];
  const kept: string[] = [];
  for (const a of ART_ASSETS) {
    const file = path.join(ART_DIR, `${a.id}.png`);
    if (await exists(file)) {
      if (onlyMissing) continue;
      if (!isPlaceholder(await readFile(file))) {
        kept.push(a.id);
        continue;
      }
    }
    const background = isBackgroundKind(a.kind);
    todo.push({ ...a, background, scale: background ? 1 : SPRITE_SCALE });
  }

  if (todo.length) {
    const browser = await chromium.launch();
    try {
      const page = await blankPage(browser);
      const painted = await page.evaluate(paintAll, todo);
      for (const [id, url] of Object.entries(painted)) {
        const png = fromDataUrl(url);
        await writeFile(path.join(ART_DIR, `${id}.png`), withMark(png));
      }
    } finally {
      await browser.close();
    }
  }

  // Placeholders for ids that no longer exist go; anything else (real art) stays.
  const known = new Set(ART_ASSETS.map((a) => `${a.id}.png`));
  const pruned: string[] = [];
  for (const f of await readdir(ART_DIR)) {
    if (!f.endsWith('.png') || known.has(f)) continue;
    if (isPlaceholder(await readFile(path.join(ART_DIR, f)))) {
      await unlink(path.join(ART_DIR, f));
      pruned.push(f);
    }
  }
  if (pruned.length) console.log(`art: removed orphan placeholders ${pruned.join(', ')}`);

  await mkdir('docs', { recursive: true });
  await writeFile(path.join('docs', 'art.md'), `${artDoc()}\n`);
  // The count only: every committed PNG is real art, so a list of ids would bury the lines above.
  console.log(`art: ${todo.length} placeholders painted, ${kept.length} real files left alone; docs/art.md written`);
}

runMain(import.meta.url, () => paintPlaceholders(process.argv.slice(2)), 'art failed: ');
