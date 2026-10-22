/**
 * A contact sheet (the bug-hunt checker's `tests/qa/report.ts`, the battle shots'
 * `tests/shots/contact.ts`): six shots a row at a quarter size (320×180), each under
 * an 18 px strip with its label. Each caller keeps its own label text and type size.
 */

import sharp, { type OverlayOptions } from 'sharp';

const W = 320;
const H = 180;
const COLS = 6;
const STRIP = 18;

/** Where a label's text sits in its strip, and its size (px). */
export interface LabelStyle {
  x: number;
  y: number;
  size: number;
}

/** Lay `files` (names in `dir`, in the order given) on one sheet at `out`, each labelled by `label(file)`. */
export async function contactSheet(files: string[], dir: string, out: string, label: (file: string) => string, style: LabelStyle): Promise<void> {
  const tiles: OverlayOptions[] = [];
  for (const [i, f] of files.entries()) {
    const x = (i % COLS) * W;
    const y = Math.floor(i / COLS) * (H + STRIP);
    tiles.push({ input: await sharp(`${dir}/${f}`).resize(W, H).toBuffer(), left: x, top: y + STRIP });
    const text = label(f).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    tiles.push({ input: Buffer.from(`<svg width="${W}" height="${STRIP}"><text x="${style.x}" y="${style.y}" font-family="Arial" font-size="${style.size}">${text}</text></svg>`), left: x, top: y });
  }
  const rows = Math.ceil(files.length / COLS);
  await sharp({ create: { width: COLS * W, height: rows * (H + STRIP), channels: 3, background: '#ffffff' } })
    .composite(tiles)
    .png()
    .toFile(out);
}
