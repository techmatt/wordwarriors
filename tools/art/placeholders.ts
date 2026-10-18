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

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

import { ART_ASSETS, type ArtAsset } from '../../content/art/assets.js';
import { isMain } from '../voice/clips.js';

const OUT = path.join('public', 'art');
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

function isPlaceholder(png: Buffer): boolean {
  return png.includes(Buffer.from(`tEXt${MARK_KEY}\0${MARK_VALUE}`, 'latin1'));
}

// -- painting (runs inside the page) ------------------------------------------

function paintAll(list: ArtAsset[]): Record<string, string> {
  const hex = (n: number, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  const shade = (n: number, f: number) => {
    const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  const out: Record<string, string> = {};

  for (const a of list) {
    const scale = a.kind === 'arena' || a.kind === 'room' ? 1 : 2;
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
          const x = cx + Math.cos(t) * (W / 2) * r * 1.0;
          const y = cy + Math.sin(t) * (H / 2) * r * 1.0;
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
    } else if (a.kind === 'arena' || a.kind === 'room') {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, hex(c1));
      sky.addColorStop(1, hex(c2));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      if (a.kind === 'arena') {
        // Hills and a flat floor, so fighters have somewhere to stand.
        g.fillStyle = hex(shade(c2, 0.75), 0.6);
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.ellipse((i + 0.5) * (W / 5), H * 0.48, W * 0.16, H * 0.14, 0, Math.PI, 0);
          g.fill();
        }
        const floor = g.createLinearGradient(0, H * 0.42, 0, H);
        floor.addColorStop(0, hex(shade(c2, 0.55)));
        floor.addColorStop(1, hex(shade(c1, 0.6)));
        g.fillStyle = floor;
        g.fillRect(0, H * 0.45, W, H * 0.55);
      } else {
        g.fillStyle = hex(0x000000, 0.12);
        g.fillRect(0, H * 0.62, W, H * 0.38);
      }
      if (a.glyph) {
        g.globalAlpha = 0.22;
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
      if (a.glyph) emoji(a.glyph, W / 2, H / 2 + 6 * scale, W * 0.62);
      else {
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const cx = W / 2;
        const cy = H / 2;
        const u = W / 10;
        if (a.draw === 'fan') {
          for (let i = 0; i < 7; i++) {
            const t0 = Math.PI * (1.1 + i * 0.115);
            g.beginPath();
            g.moveTo(cx, cy + 2.5 * u);
            g.arc(cx, cy + 2.5 * u, 4.2 * u, t0, t0 + 0.115 * Math.PI);
            g.closePath();
            g.fillStyle = hex(i % 2 ? 0xff5ab4 : 0xffd23f);
            g.fill();
            g.strokeStyle = hex(0x5a2a1a);
            g.lineWidth = 2 * scale;
            g.stroke();
          }
        } else if (a.draw === 'log') {
          g.fillStyle = hex(0x9a5a2a);
          roundRect(cx - 3.6 * u, cy - 1.3 * u, 6.4 * u, 2.6 * u, 1.3 * u);
          g.fill();
          g.beginPath();
          g.ellipse(cx + 2.8 * u, cy, 1 * u, 1.3 * u, 0, 0, Math.PI * 2);
          g.fillStyle = hex(0xe8c890);
          g.fill();
          g.strokeStyle = hex(0x9a5a2a);
          g.lineWidth = 3 * scale;
          g.beginPath();
          g.ellipse(cx + 2.8 * u, cy, 0.5 * u, 0.7 * u, 0, 0, Math.PI * 2);
          g.stroke();
        } else if (a.draw === 'mop') {
          g.strokeStyle = hex(0x9a5a2a);
          g.lineWidth = 0.5 * u;
          g.beginPath();
          g.moveTo(cx + 2 * u, cy - 3.5 * u);
          g.lineTo(cx, cy + 1.5 * u);
          g.stroke();
          g.strokeStyle = hex(0x8ad7ff);
          g.lineWidth = 0.35 * u;
          for (let i = -4; i <= 4; i++) {
            g.beginPath();
            g.moveTo(cx, cy + 1.5 * u);
            g.quadraticCurveTo(cx + i * 0.3 * u, cy + 2.6 * u, cx + i * 0.45 * u, cy + 3.6 * u);
            g.stroke();
          }
        } else if (a.draw === 'pot') {
          g.fillStyle = hex(0x4a4a5a);
          g.beginPath();
          g.moveTo(cx - 3 * u, cy - 1 * u);
          g.lineTo(cx + 3 * u, cy - 1 * u);
          g.lineTo(cx + 2.5 * u, cy + 2.5 * u);
          g.lineTo(cx - 2.5 * u, cy + 2.5 * u);
          g.closePath();
          g.fill();
          g.fillRect(cx - 3.6 * u, cy - 1.4 * u, 7.2 * u, 0.6 * u);
          g.strokeStyle = hex(0x4a4a5a);
          g.lineWidth = 0.4 * u;
          g.beginPath();
          g.arc(cx - 3.6 * u, cy - 0.2 * u, 0.6 * u, Math.PI * 0.5, Math.PI * 1.5);
          g.arc(cx + 3.6 * u, cy - 0.2 * u, 0.6 * u, Math.PI * 1.5, Math.PI * 0.5);
          g.stroke();
          g.strokeStyle = hex(0xffffff, 0.7);
          g.lineWidth = 0.25 * u;
          for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(cx + i * u, cy - 1.8 * u);
            g.bezierCurveTo(cx + i * u - 0.5 * u, cy - 2.6 * u, cx + i * u + 0.5 * u, cy - 3 * u, cx + i * u, cy - 3.8 * u);
            g.stroke();
          }
        }
      }
    } else {
      // Props.
      const id = a.id;
      if (id === 'prop_stone') {
        g.beginPath();
        g.ellipse(W / 2, H / 2, W * 0.46, H * 0.46, 0, 0, Math.PI * 2);
        const gr = g.createRadialGradient(W * 0.4, H * 0.35, 4, W / 2, H / 2, W * 0.5);
        gr.addColorStop(0, hex(0xd8d8e0));
        gr.addColorStop(1, hex(0x7a7a8a));
        g.fillStyle = gr;
        g.fill();
        g.lineWidth = 8;
        g.strokeStyle = hex(0x4a8a4a);
        g.stroke();
      } else if (id === 'prop_tile') {
        roundRect(6, 6, W - 12, H - 12, 24);
        g.fillStyle = hex(0xc8b89a);
        g.fill();
        g.lineWidth = 8;
        g.strokeStyle = hex(0x7a6a4a);
        g.stroke();
      } else if (id === 'prop_door') {
        g.fillStyle = hex(0x6a6a7a);
        roundRect(0, 0, W, H, W / 2);
        g.fill();
        g.fillStyle = hex(0xb4643a);
        roundRect(W * 0.1, H * 0.06, W * 0.8, H * 0.94, W * 0.4);
        g.fill();
        g.fillStyle = hex(0xfffaf0);
        roundRect(W * 0.18, H * 0.16, W * 0.64, W * 0.64, 20);
        g.fill();
        g.fillStyle = hex(0xffd23f);
        g.beginPath();
        g.arc(W * 0.75, H * 0.7, 10, 0, Math.PI * 2);
        g.fill();
      } else if (id === 'prop_pedestal') {
        g.fillStyle = hex(0xe8e4f0);
        g.fillRect(W * 0.08, 0, W * 0.84, H * 0.22);
        g.fillRect(W * 0.18, H * 0.22, W * 0.64, H * 0.6);
        g.fillRect(W * 0.04, H * 0.82, W * 0.92, H * 0.18);
        g.strokeStyle = hex(0x9a94b0);
        g.lineWidth = 4;
        g.strokeRect(W * 0.18, H * 0.22, W * 0.64, H * 0.6);
      } else if (id === 'prop_banner') {
        g.fillStyle = hex(0xc8323a);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(W, 0);
        g.lineTo(W * 0.96, H * 0.5);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.lineTo(W * 0.04, H * 0.5);
        g.closePath();
        g.fill();
        g.fillStyle = hex(0xfff3d6);
        g.fillRect(W * 0.08, H * 0.12, W * 0.84, H * 0.76);
      } else if (id === 'prop_anvil' || id === 'prop_tent' || a.glyph) {
        emoji(a.glyph || '✨', W / 2, H / 2, Math.min(W, H) * 0.85);
      }
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
    ['room', 'Rooms (episode screens and minigames)'],
    ['picture', 'Word pictures'],
    ['item', 'Counter items'],
    ['prop', 'Minigame props and effects'],
  ];
  const out: string[] = [
    '# Art assets',
    '',
    'Generated by `npm run art:placeholders` from `content/art/assets.ts`. Do not edit by hand.',
    '',
    'Every asset is `public/art/<id>.png`. To drop in real art, overwrite that file: the id is',
    'stable and the game fits the image into the display size below, keeping its aspect ratio.',
    'Transparent PNG for everything except arenas and rooms. The placeholder painter never',
    'overwrites a file it did not paint (it marks its own with a PNG text chunk).',
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

async function exists(file: string): Promise<boolean> {
  return stat(file).then(
    () => true,
    () => false,
  );
}

export async function paintPlaceholders(argv: string[]): Promise<void> {
  const onlyMissing = argv.includes('--missing');
  await mkdir(OUT, { recursive: true });

  const todo: ArtAsset[] = [];
  const kept: string[] = [];
  for (const a of ART_ASSETS) {
    const file = path.join(OUT, `${a.id}.png`);
    if (await exists(file)) {
      if (onlyMissing) continue;
      if (!isPlaceholder(await readFile(file))) {
        kept.push(a.id);
        continue;
      }
    }
    todo.push(a);
  }

  if (todo.length) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      // tsx compiles with keepNames, which wraps inner functions in `__name(...)`;
      // the page has no such helper unless we give it one.
      await page.evaluate('window.__name = (f) => f');
      const painted = await page.evaluate(paintAll, todo);
      for (const [id, url] of Object.entries(painted)) {
        const png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
        await writeFile(path.join(OUT, `${id}.png`), withMark(png));
      }
    } finally {
      await browser.close();
    }
  }

  await mkdir('docs', { recursive: true });
  await writeFile(path.join('docs', 'art.md'), `${artDoc()}\n`);
  console.log(`art: ${todo.length} placeholders painted, ${kept.length} real files left alone${kept.length ? ` (${kept.join(', ')})` : ''}; docs/art.md written`);
}

if (isMain(import.meta.url)) {
  paintPlaceholders(process.argv.slice(2)).catch((error: unknown) => {
    console.error(`art failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
