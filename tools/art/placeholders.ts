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

import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
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

export function isPlaceholder(png: Buffer): boolean {
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
        // A silhouette skyline per arena, then a flat floor for the fighters.
        const sil = hex(shade(c1, 0.55), 0.85);
        const far = hex(shade(c2, 0.7), 0.55);
        const hz = H * 0.46;
        const poly = (pts: [number, number][], fill: string) => {
          g.beginPath();
          pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath();
          g.fillStyle = fill;
          g.fill();
        };
        const id = a.id.replace('arena_', '');
        if (id === 'desert') {
          poly([[W * 0.55, hz], [W * 0.72, H * 0.12], [W * 0.89, hz]], far);
          poly([[W * 0.75, hz], [W * 0.84, H * 0.26], [W * 0.93, hz]], sil);
          for (let i = 0; i < 4; i++) {
            g.fillStyle = sil;
            g.fillRect(W * (0.08 + i * 0.1), hz - H * 0.12, W * 0.025, H * 0.12);
          }
        } else if (id === 'castle') {
          for (let i = 0; i < 5; i++) {
            const x = W * (0.1 + i * 0.2);
            const h = H * (0.22 + (i % 2) * 0.1);
            g.fillStyle = sil;
            g.fillRect(x - W * 0.04, hz - h, W * 0.08, h);
            for (let k = 0; k < 3; k++) g.fillRect(x - W * 0.04 + k * W * 0.032, hz - h - 18, W * 0.018, 18);
            poly([[x - W * 0.05, hz - h - 18], [x, hz - h - H * 0.12], [x + W * 0.05, hz - h - 18]], far);
          }
          g.fillStyle = sil;
          g.fillRect(0, hz - H * 0.1, W, H * 0.1);
        } else if (id === 'ice') {
          for (let i = 0; i < 9; i++) {
            const x = W * (0.05 + i * 0.115);
            const h = H * (0.16 + ((i * 37) % 5) * 0.05);
            poly([[x - 36, hz], [x, hz - h], [x + 36, hz]], i % 2 ? hex(0xffffff, 0.7) : hex(0xaee6ff, 0.8));
          }
        } else if (id === 'volcano') {
          poly([[W * 0.2, hz], [W * 0.42, H * 0.14], [W * 0.52, H * 0.14], [W * 0.74, hz]], sil);
          g.fillStyle = hex(0xff7b00, 0.9);
          g.beginPath();
          g.ellipse(W * 0.47, H * 0.14, W * 0.05, 12, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = hex(0xff4a00, 0.9);
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(W * 0.46, H * 0.16);
          g.quadraticCurveTo(W * 0.4, H * 0.3, W * 0.34, hz);
          g.stroke();
        } else if (id === 'sea') {
          for (let row = 0; row < 3; row++) {
            g.fillStyle = hex(shade(c2, 0.9 - row * 0.12), 0.8);
            g.beginPath();
            g.moveTo(0, hz);
            for (let x = 0; x <= W; x += 40) g.lineTo(x, hz - 30 - row * 28 + Math.sin(x / 70 + row) * 14);
            g.lineTo(W, hz);
            g.closePath();
            g.fill();
          }
          poly([[W * 0.12, hz], [W * 0.18, hz - H * 0.15], [W * 0.26, hz]], sil);
          poly([[W * 0.78, hz], [W * 0.86, hz - H * 0.2], [W * 0.95, hz]], sil);
        } else if (id === 'factory') {
          for (let i = 0; i < 6; i++) {
            const x = W * (0.04 + i * 0.17);
            g.fillStyle = sil;
            g.fillRect(x, hz - H * (0.14 + (i % 3) * 0.05), W * 0.12, H * (0.14 + (i % 3) * 0.05));
            g.fillRect(x + W * 0.02, hz - H * 0.3, W * 0.025, H * 0.12);
            g.fillStyle = hex(0x00f5d4, 0.7);
            for (let k = 0; k < 3; k++) g.fillRect(x + 10 + k * 34, hz - H * 0.09, 20, 14);
          }
        } else if (id === 'city') {
          for (let i = 0; i < 14; i++) {
            const x = (i * W) / 14;
            const h = H * (0.1 + ((i * 53) % 7) * 0.035);
            g.fillStyle = sil;
            g.fillRect(x + 4, hz - h, W / 14 - 8, h);
            g.fillStyle = hex(0xffe8a0, 0.7);
            for (let k = 0; k < 4; k++) if ((i + k) % 3) g.fillRect(x + 14, hz - h + 12 + k * 22, 10, 10);
          }
          g.strokeStyle = sil;
          g.lineWidth = 10;
          g.beginPath();
          g.arc(W * 0.82, hz - H * 0.2, H * 0.16, 0, Math.PI * 2);
          g.stroke();
        } else if (id === 'cave') {
          for (let i = 0; i < 16; i++) {
            const x = (i * W) / 15;
            poly([[x - 30, 0], [x, H * (0.12 + ((i * 29) % 5) * 0.03)], [x + 30, 0]], sil);
          }
          for (let i = 0; i < 6; i++) {
            g.fillStyle = hex(0xffcc33, 0.85);
            g.beginPath();
            g.ellipse(W * (0.1 + i * 0.16), hz, W * 0.07, H * 0.06, 0, Math.PI, 0);
            g.fill();
          }
        } else if (id === 'kitchen') {
          g.fillStyle = hex(0xffffff, 0.35);
          for (let y = 0; y < hz; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) g.fillRect(x, y, 28, 28);
          g.fillStyle = sil;
          g.fillRect(W * 0.6, hz - H * 0.22, W * 0.3, H * 0.22);
          g.fillStyle = hex(0x333344, 1);
          g.beginPath();
          g.ellipse(W * 0.3, hz - H * 0.06, W * 0.09, H * 0.05, 0, 0, Math.PI * 2);
          g.fill();
        } else {
          // Meadow: rolling hills and flowers.
          g.fillStyle = far;
          for (let i = 0; i < 6; i++) {
            g.beginPath();
            g.ellipse((i + 0.5) * (W / 5), hz + 10, W * 0.16, H * 0.16, 0, Math.PI, 0);
            g.fill();
          }
        }
        const floor = g.createLinearGradient(0, H * 0.42, 0, H);
        const gr = a.ground ?? shade(c2, 0.55);
        floor.addColorStop(0, hex(shade(gr, 1.05)));
        floor.addColorStop(1, hex(shade(gr, 0.62)));
        g.fillStyle = floor;
        g.fillRect(0, H * 0.45, W, H * 0.55);
      } else {
        // Rooms: a simple set per room, drawn behind where she walks.
        const id = a.id.replace('room_', '');
        const dark = hex(shade(c1, 0.6), 0.8);
        const house = id === 'hub' || id.startsWith('bedroom_') || id.startsWith('side_');
        if (house) {
          // The house: a back wall in the first colour, a skirting board, and a
          // floor in the second colour across the lower half where she walks.
          const fy = H * 0.5;
          g.fillStyle = hex(shade(c1, 1.1));
          g.fillRect(0, 0, W, fy);
          g.fillStyle = hex(0xffffff, 0.08);
          for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, fy);
          // A window, with sky, off to one side.
          const wx = id === 'hub' ? W * 0.08 : W * 0.4;
          g.fillStyle = hex(shade(c1, 0.55));
          roundRect(wx - 8, H * 0.1 - 8, 196, 156, 14);
          g.fill();
          const skyG = g.createLinearGradient(0, H * 0.1, 0, H * 0.1 + 140);
          skyG.addColorStop(0, hex(id === 'side_attic' ? 0x1a2a5a : 0x8ad7ff));
          skyG.addColorStop(1, hex(id === 'side_attic' ? 0x3a4a8a : 0xd8f4ff));
          g.fillStyle = skyG;
          roundRect(wx, H * 0.1, 180, 140, 10);
          g.fill();
          g.fillStyle = hex(shade(c1, 0.55));
          g.fillRect(wx + 86, H * 0.1, 8, 140);
          g.fillRect(wx, H * 0.1 + 66, 180, 8);
          if (id === 'side_attic') {
            // Sloped roof beams.
            g.fillStyle = hex(0x3a2418, 0.9);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(W * 0.3, 0);
            g.lineTo(0, H * 0.35);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(W, 0);
            g.lineTo(W * 0.7, 0);
            g.lineTo(W, H * 0.35);
            g.closePath();
            g.fill();
          }
          g.fillStyle = hex(shade(c1, 0.5));
          g.fillRect(0, fy - 16, W, 16);
          const floor = g.createLinearGradient(0, fy, 0, H);
          floor.addColorStop(0, hex(shade(c2, 1.05)));
          floor.addColorStop(1, hex(shade(c2, 0.7)));
          g.fillStyle = floor;
          g.fillRect(0, fy, W, H - fy);
          // Floorboards (or tiles in the kitchen).
          g.strokeStyle = hex(0x000000, 0.12);
          g.lineWidth = 3;
          if (id === 'side_kitchen') {
            for (let y = fy; y < H; y += 60) {
              g.beginPath();
              g.moveTo(0, y);
              g.lineTo(W, y);
              g.stroke();
            }
            for (let x = 0; x < W; x += 80) {
              g.beginPath();
              g.moveTo(x, fy);
              g.lineTo(x, H);
              g.stroke();
            }
          } else {
            for (let y = fy + 30; y < H; y += 36) {
              g.beginPath();
              g.moveTo(0, y);
              g.lineTo(W, y);
              g.stroke();
            }
          }
          // A rug where the middle of the room is.
          g.fillStyle = hex(shade(c1, 0.85), 0.35);
          g.beginPath();
          g.ellipse(W / 2, H * 0.78, W * 0.28, H * 0.12, 0, 0, Math.PI * 2);
          g.fill();
        } else if (id === 'title' || id === 'victory') {
          g.fillStyle = hex(0xffd23f, 0.12);
          for (let i = 0; i < 12; i++) {
            g.beginPath();
            g.moveTo(W / 2, H * 0.62);
            g.arc(W / 2, H * 0.62, W, (i / 12) * Math.PI * 2, (i / 12 + 1 / 24) * Math.PI * 2);
            g.closePath();
            g.fill();
          }
          g.fillStyle = dark;
          for (const [x, h] of [[0.12, 0.2], [0.24, 0.3], [0.76, 0.3], [0.88, 0.2]] as [number, number][]) {
            g.fillRect(W * x - 40, H * (0.62 - h), 80, H * h);
            g.beginPath();
            g.moveTo(W * x - 50, H * (0.62 - h));
            g.lineTo(W * x, H * (0.62 - h - 0.1));
            g.lineTo(W * x + 50, H * (0.62 - h));
            g.fill();
          }
        } else if (id === 'pick') {
          for (let i = 0; i < 5; i++) {
            g.fillStyle = hex(0xfff3c4, 0.1);
            g.beginPath();
            g.moveTo(W * (0.1 + i * 0.2), 0);
            g.lineTo(W * (0.02 + i * 0.2), H * 0.95);
            g.lineTo(W * (0.18 + i * 0.2), H * 0.95);
            g.closePath();
            g.fill();
          }
          g.fillStyle = hex(0x8a2a3a, 0.9);
          g.fillRect(0, 0, W, 30);
          for (let x = 0; x < W; x += 80) {
            g.beginPath();
            g.arc(x + 40, 30, 40, 0, Math.PI);
            g.fill();
          }
        } else if (id === 'stones') {
          for (let i = 0; i < 7; i++) {
            const x = W * (0.04 + i * 0.16);
            g.fillStyle = hex(0x5a3a1a, 0.8);
            g.fillRect(x - 10, H * 0.38, 20, H * 0.24);
            g.fillStyle = hex(i % 2 ? 0x3a8a4a : 0x2a7a3a, 0.9);
            g.beginPath();
            g.arc(x, H * 0.34, 70, 0, Math.PI * 2);
            g.fill();
          }
        } else if (id === 'path') {
          g.fillStyle = hex(0x5ab4ff, 0.5);
          g.fillRect(0, H * 0.53, W, H * 0.06);
          g.fillStyle = hex(0xffffff, 0.4);
          for (let x = 0; x < W; x += 90) g.fillRect(x, H * 0.555, 40, 4);
          g.fillStyle = hex(0x6a8a5a, 0.6);
          for (let i = 0; i < 8; i++) {
            g.beginPath();
            g.ellipse(W * (0.06 + i * 0.13), H * 0.4, 80, 50, 0, Math.PI, 0);
            g.fill();
          }
        } else if (id === 'gallery') {
          for (let i = 0; i < 5; i++) {
            const x = W * (0.1 + i * 0.2);
            g.fillStyle = hex(0xb8862a, 0.9);
            g.fillRect(x - 60, H * 0.2, 120, 90);
            g.fillStyle = hex([0x9ad8ff, 0xff9ad5, 0x8aff8a, 0xffd23f, 0xc8a0ff][i]!, 0.9);
            g.fillRect(x - 48, H * 0.2 + 12, 96, 66);
          }
          g.fillStyle = hex(0x5a3a2a, 0.35);
          g.fillRect(0, H * 0.58, W, 14);
        } else if (id === 'forge') {
          g.fillStyle = hex(0x000000, 0.18);
          for (let y = 0; y < H * 0.6; y += 40) for (let x = (y / 40) % 2 ? -40 : 0; x < W; x += 80) g.fillRect(x + 2, y + 2, 76, 36);
          const glow = g.createRadialGradient(W * 0.5, H * 0.6, 10, W * 0.5, H * 0.6, W * 0.35);
          glow.addColorStop(0, hex(0xffb030, 0.55));
          glow.addColorStop(1, hex(0xffb030, 0));
          g.fillStyle = glow;
          g.fillRect(0, 0, W, H);
        } else if (id === 'camp') {
          g.fillStyle = hex(0xfff3c4, 0.9);
          g.beginPath();
          g.arc(W * 0.82, H * 0.14, 46, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = hex(0x0a1a12, 0.9);
          for (let i = 0; i < 12; i++) {
            const x = W * (i / 11);
            const h = H * (0.22 + ((i * 41) % 4) * 0.05);
            g.beginPath();
            g.moveTo(x - 50, H * 0.6);
            g.lineTo(x, H * 0.6 - h);
            g.lineTo(x + 50, H * 0.6);
            g.closePath();
            g.fill();
          }
        }
        if (!house) {
          g.fillStyle = hex(0x000000, 0.12);
          g.fillRect(0, H * 0.62, W, H * 0.38);
        }
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
        } else if (a.draw === 'mug') {
          g.strokeStyle = hex(0x3a86ff);
          g.lineWidth = 0.7 * u;
          g.beginPath();
          g.arc(cx + 2.2 * u, cy + 0.3 * u, 1.3 * u, -Math.PI * 0.5, Math.PI * 0.5);
          g.stroke();
          g.fillStyle = hex(0x3a86ff);
          roundRect(cx - 2.6 * u, cy - 2.4 * u, 4.8 * u, 5.2 * u, 0.8 * u);
          g.fill();
          g.fillStyle = hex(0x7a4a2a);
          g.beginPath();
          g.ellipse(cx - 0.2 * u, cy - 2.2 * u, 2.2 * u, 0.5 * u, 0, 0, Math.PI * 2);
          g.fill();
        } else if (a.draw === 'rug') {
          g.fillStyle = hex(0xe63946);
          roundRect(cx - 3.6 * u, cy - 2.2 * u, 7.2 * u, 4.4 * u, 0.4 * u);
          g.fill();
          for (const [k, c] of [[1.4, 0xffd23f], [0.6, 0x3a86ff]] as const) {
            g.fillStyle = hex(c);
            g.fillRect(cx - (3.6 - k * 1.5) * u, cy - (2.2 - k * 1.2) * u, (7.2 - k * 3) * u, (4.4 - k * 2.4) * u);
          }
          g.strokeStyle = hex(0xfff3c4);
          g.lineWidth = 0.2 * u;
          for (let i = -1.8; i <= 1.8; i += 0.6) {
            for (const s of [-1, 1]) {
              g.beginPath();
              g.moveTo(cx + s * 3.6 * u, cy + i * u);
              g.lineTo(cx + s * 4.2 * u, cy + i * u);
              g.stroke();
            }
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
      } else if (id === 'prop_front_door') {
        g.fillStyle = hex(0xf0e8d8);
        g.fillRect(0, 0, W, H * 0.95);
        g.fillStyle = hex(0xc8323a);
        roundRect(W * 0.1, H * 0.05, W * 0.8, H * 0.9, 14);
        g.fill();
        g.strokeStyle = hex(0x8a1a22);
        g.lineWidth = 6;
        g.strokeRect(W * 0.2, H * 0.36, W * 0.6, H * 0.22);
        g.strokeRect(W * 0.2, H * 0.64, W * 0.6, H * 0.22);
        g.fillStyle = hex(0xbfe8ff);
        roundRect(W * 0.25, H * 0.1, W * 0.5, H * 0.18, 12);
        g.fill();
        g.fillStyle = hex(0xffd23f);
        g.beginPath();
        g.arc(W * 0.76, H * 0.6, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hex(0x8a5a3a);
        g.fillRect(W * 0.05, H * 0.95, W * 0.9, H * 0.05);
      } else if (id === 'prop_magic_circle') {
        const cx = W / 2;
        const cy = H / 2;
        const glow = g.createRadialGradient(cx, cy, 4, cx, cy, W / 2);
        glow.addColorStop(0, hex(0xc8a0ff, 0.7));
        glow.addColorStop(1, hex(0x7a5aff, 0));
        g.fillStyle = glow;
        g.beginPath();
        g.ellipse(cx, cy, W / 2, H / 2, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = hex(0x9ad8ff, 0.95);
        for (const [f, lw] of [[0.92, 8], [0.7, 5]] as [number, number][]) {
          g.lineWidth = lw;
          g.beginPath();
          g.ellipse(cx, cy, (W / 2) * f, (H / 2) * f, 0, 0, Math.PI * 2);
          g.stroke();
        }
        // Rune ticks round the ring: abstract marks, never letters.
        g.lineWidth = 4;
        for (let i = 0; i < 16; i++) {
          const t = (i / 16) * Math.PI * 2;
          const x = cx + Math.cos(t) * (W / 2) * 0.81;
          const y = cy + Math.sin(t) * (H / 2) * 0.81;
          g.beginPath();
          g.moveTo(x - 6, y - 3);
          g.lineTo(x + 6, y + 3);
          g.stroke();
        }
      } else if (id === 'prop_scroll') {
        const r = H * 0.16;
        g.fillStyle = hex(0xfff3d6);
        g.fillRect(r * 1.2, H * 0.12, W - r * 2.4, H * 0.76);
        g.strokeStyle = hex(0xffd23f, 0.9);
        g.lineWidth = 6;
        g.strokeRect(r * 1.2, H * 0.12, W - r * 2.4, H * 0.76);
        for (const x of [r * 1.2, W - r * 1.2]) {
          g.fillStyle = hex(0xe8c890);
          roundRect(x - r, H * 0.04, r * 2, H * 0.92, r);
          g.fill();
          g.fillStyle = hex(0x8a5a2a);
          g.beginPath();
          g.arc(x, H * 0.04, r * 0.55, 0, Math.PI * 2);
          g.arc(x, H * 0.96, r * 0.55, 0, Math.PI * 2);
          g.fill();
        }
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

  // Placeholders for ids that no longer exist go; anything else (real art) stays.
  const known = new Set(ART_ASSETS.map((a) => `${a.id}.png`));
  const pruned: string[] = [];
  for (const f of await readdir(OUT)) {
    if (!f.endsWith('.png') || known.has(f)) continue;
    if (isPlaceholder(await readFile(path.join(OUT, f)))) {
      await unlink(path.join(OUT, f));
      pruned.push(f);
    }
  }
  if (pruned.length) console.log(`art: removed orphan placeholders ${pruned.join(', ')}`);

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
