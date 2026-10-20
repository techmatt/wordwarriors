/**
 * Contact sheets of a `polish.pw.ts` run (item 034), one per battle:
 *   npx tsx tests/shots/contact.ts <tag> [filter]
 * reads `scratch/polish_034/<tag>/<cast>_p<part>_<n>_<what>.png` and writes
 * `scratch/polish_034/<tag>_sheets/<cast>_p<part>.png`, six shots a row at a
 * quarter size, each numbered so a frame can be opened full size.
 */

import { mkdirSync, readdirSync } from 'node:fs';

import sharp, { type OverlayOptions } from 'sharp';

const [tag = 'before', filter = ''] = process.argv.slice(2);
const dir = `scratch/polish_034/${tag}`;
const out = `scratch/polish_034/${tag}_sheets`;
mkdirSync(out, { recursive: true });

const W = 320;
const H = 180;
const COLS = 6;

const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.includes(filter));
const groups = new Map<string, string[]>();
for (const f of files) {
  const m = /^(.*_p\d)_\d{3}_/.exec(f);
  if (!m) continue;
  groups.set(m[1]!, [...(groups.get(m[1]!) ?? []), f]);
}

for (const [name, list] of groups) {
  list.sort();
  const rows = Math.ceil(list.length / COLS);
  const tiles: OverlayOptions[] = [];
  for (const [i, f] of list.entries()) {
    const x = (i % COLS) * W;
    const y = Math.floor(i / COLS) * (H + 18);
    tiles.push({ input: await sharp(`${dir}/${f}`).resize(W, H).toBuffer(), left: x, top: y + 18 });
    const label = f.slice(name.length + 1, -4);
    tiles.push({ input: Buffer.from(`<svg width="${W}" height="18"><text x="4" y="14" font-family="Arial" font-size="13">${label}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: COLS * W, height: rows * (H + 18), channels: 3, background: '#ffffff' } })
    .composite(tiles)
    .png()
    .toFile(`${out}/${name}.png`);
  console.log(`${out}/${name}.png (${list.length})`);
}
