/**
 * Art candidates for Matt to choose from, without touching the game's art.
 *
 * `npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--no-ref]`
 * draws `n` new candidates per id with the same prompt and photo reference as
 * `art:gen`, and keeps each full-resolution image as
 * `art-originals/alts/<id>-<k>.png` (k counts on from the last one there).
 * `public/art/` is not touched. `--sheet=<file>` then writes a contact sheet of
 * the named ids: one row per id, the game's current image first (labelled
 * `current`), then every candidate labelled with its `k`, all cut exactly as
 * `art:gen` would cut them and drawn at one scale.
 *
 * `npm run art:pick -- <id> <k>` makes candidate `k` the game's art: it becomes
 * `art-originals/<id>.png` and is cut into `public/art/<id>.png` by the same
 * processing as `art:gen`. The first pick of an id saves what was there as
 * candidate 0 (`<id>-0.png`, plus `<id>-0.game.png`, the committed PNG), so
 * `art:pick -- <id> 0` puts the original art back.
 */

import { appendFile, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';

import { ART_BY_ID } from '../../content/art/assets.js';
import { NO_GREEN, refFor } from '../../content/art/prompts.js';
import { isMain } from '../voice/clips.js';
import { ORIGINALS, OUT, codexPrompt, cut, describeUsage, exists, isBackground, openPage, processImage, refCrop, runCodex } from './generate.js';

export const ALTS = path.join(ORIGINALS, 'alts');
const SPRITE_SCALE = 2;

const altFile = (id: string, k: number | string) => path.join(ALTS, `${id}-${k}.png`);

/** The candidate numbers kept for an id, ascending (0, the saved original, included if present). */
export async function candidates(id: string): Promise<number[]> {
  const files = await readdir(ALTS).catch(() => [] as string[]);
  const re = new RegExp(`^${id}-(\\d+)\\.png$`);
  return files
    .map((f) => f.match(re)?.[1])
    .filter((k): k is string => k !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

async function draw(argv: string[]): Promise<void> {
  const n = Number(argv.find((a) => a.startsWith('--n='))?.slice(4) ?? 3);
  const noRef = argv.includes('--no-ref');
  const ids = argv.filter((a) => !a.startsWith('--'));
  for (const id of ids) codexPrompt(id); // fail before spending anything on a bad id
  await mkdir(ALTS, { recursive: true });
  for (const id of ids) {
    const ref = noRef ? undefined : await refCrop(id);
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, ...(await candidates(id))) + 1;
      console.log(`art:alts: ${id} candidate ${k} (${i + 1}/${n}): asking codex…`);
      const log = (r: Awaited<ReturnType<typeof runCodex>>, withRef: boolean) =>
        appendFile(path.join(ORIGINALS, 'log.jsonl'), `${JSON.stringify({ id, alt: k, at: new Date().toISOString(), ref: withRef, seconds: r.seconds, thread: r.thread, image: r.image, limit: r.limit, usage: r.usage, message: r.lastMessage })}\n`);
      let run = await runCodex(codexPrompt(id, !!ref), ref);
      await log(run, !!ref);
      if (ref && !run.image && !run.limit) {
        console.error(`art:alts: ${id}: no image with the photo reference (${run.lastMessage ?? '?'}); retrying with text alone`);
        run = await runCodex(codexPrompt(id));
        await log(run, false);
      }
      if (run.limit) {
        console.error(`art:alts: usage limit: ${run.limit}`);
        if (run.image) await copyFile(run.image, altFile(id, k));
        return;
      }
      if (!run.image) {
        console.error(`art:alts: ${id}: no image after ${run.seconds}s. ${run.lastMessage ?? ''}`);
        continue;
      }
      await copyFile(run.image, altFile(id, k));
      console.log(`art:alts: ${id}-${k}: ${run.seconds}s${refFor(id) ? (ref ? ', with photo' : ', text only') : ''}, ${describeUsage(run.usage)}`);
    }
  }
}

/** A candidate's original, cut exactly as the game would cut it, as a data URL. */
async function gameCut(page: Page, id: string, original: Buffer): Promise<string> {
  const a = ART_BY_ID[id]!;
  const sprite = !isBackground(id);
  const scale = sprite ? SPRITE_SCALE : 1;
  return (await processImage(page, original, { sprite, boxW: a.w * scale, boxH: a.h * scale, noGreen: NO_GREEN.has(id) })).url;
}

export async function altSheet(page: Page, ids: string[], file: string): Promise<void> {
  const rows: { id: string; tiles: { label: string; src: string }[] }[] = [];
  for (const id of ids) {
    const tiles = [{ label: 'current', src: `data:image/png;base64,${(await readFile(path.join(OUT, `${id}.png`))).toString('base64')}` }];
    for (const k of await candidates(id)) if (k > 0) tiles.push({ label: String(k), src: await gameCut(page, id, await readFile(altFile(id, k))) });
    rows.push({ id, tiles });
  }
  const wide = ids.some(isBackground);
  const url = await page.evaluate(
    async ({ rows, wide }) => {
      const TW = wide ? 480 : 300;
      const TH = wide ? 270 : 300;
      const L = 34;
      const HEAD = 36;
      const imgs = await Promise.all(
        rows.map((r) =>
          Promise.all(
            r.tiles.map(async (t) => {
              const img = new Image();
              img.src = t.src;
              await img.decode();
              return img;
            }),
          ),
        ),
      );
      // One scale for the whole sheet, so sizes compare truly.
      let s = Infinity;
      for (const row of imgs) for (const img of row) s = Math.min(s, (TW - 12) / img.naturalWidth, (TH - 12) / img.naturalHeight);
      const cols = Math.max(...rows.map((r) => r.tiles.length));
      const cv = document.createElement('canvas');
      cv.width = cols * TW;
      cv.height = rows.length * (HEAD + TH + L);
      const c = cv.getContext('2d')!;
      c.fillStyle = '#fff';
      c.fillRect(0, 0, cv.width, cv.height);
      for (const [r, row] of rows.entries()) {
        const y0 = r * (HEAD + TH + L);
        c.fillStyle = '#222';
        c.font = 'bold 22px monospace';
        c.textAlign = 'left';
        c.fillText(row.id, 10, y0 + 26);
        for (const [k, t] of row.tiles.entries()) {
          const x = k * TW;
          const y = y0 + HEAD;
          for (let i = 0; i < TW / 20; i++)
            for (let j = 0; j < TH / 20; j++) {
              c.fillStyle = (i + j) % 2 ? '#d8d8d8' : '#f4f4f4';
              c.fillRect(x + i * 20, y + j * 20, 20, 20);
            }
          const img = imgs[r]![k]!;
          const w = img.naturalWidth * s;
          const h = img.naturalHeight * s;
          c.drawImage(img, x + (TW - w) / 2, y + (TH - h) / 2, w, h);
          c.fillStyle = k === 0 ? '#555' : '#c0392b';
          c.font = 'bold 26px monospace';
          c.textAlign = 'center';
          c.fillText(t.label, x + TW / 2, y + TH + 26);
        }
      }
      return cv.toDataURL('image/png');
    },
    { rows, wide },
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`art:alts: contact sheet ${file} (${rows.map((r) => `${r.id} ×${r.tiles.length - 1}`).join(', ')})`);
}

export async function alts(argv: string[]): Promise<void> {
  const sheet = argv.find((a) => a.startsWith('--sheet='))?.slice('--sheet='.length);
  const ids = argv.filter((a) => !a.startsWith('--'));
  if (!ids.length) throw new Error('usage: npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--no-ref]');
  if (!argv.includes('--sheet-only')) await draw(argv);
  if (sheet) {
    const { page, close } = await openPage();
    try {
      await altSheet(page, ids, sheet);
    } finally {
      await close();
    }
  }
}

export async function pick(argv: string[]): Promise<void> {
  const [id, kArg] = argv.filter((a) => !a.startsWith('--'));
  if (!id || kArg === undefined || !/^\d+$/.test(kArg)) throw new Error('usage: npm run art:pick -- <id> <n>   (n from the contact sheet; 0 puts the original back)');
  if (!ART_BY_ID[id]) throw new Error(`${id} is not an asset id (content/art/assets.ts)`);
  const k = Number(kArg);
  const src = altFile(id, k);
  if (!(await exists(src))) throw new Error(`no candidate ${src}; have ${(await candidates(id)).join(', ') || 'none'}`);
  const orig = path.join(ORIGINALS, `${id}.png`);
  const game = path.join(OUT, `${id}.png`);
  // The first pick keeps what was there as candidate 0, so it can come back.
  if (k !== 0 && !(await exists(altFile(id, 0)))) {
    if (await exists(orig)) await copyFile(orig, altFile(id, 0));
    await copyFile(game, altFile(id, '0.game'));
    console.log(`art:pick: kept the original ${id} as candidate 0`);
  }
  await copyFile(src, orig);
  if (k === 0 && (await exists(altFile(id, '0.game')))) {
    // The original's committed PNG, byte for byte.
    await copyFile(altFile(id, '0.game'), game);
    console.log(`art:pick: ${id}: the original is back`);
    return;
  }
  const { page, close } = await openPage();
  try {
    await cut(page, id, await readFile(src), `candidate ${k}`);
  } finally {
    await close();
  }
}

if (isMain(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  (cmd === 'pick' ? pick(rest) : alts(rest)).catch((error: unknown) => {
    console.error(`art:${cmd === 'pick' ? 'pick' : 'alts'} failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
