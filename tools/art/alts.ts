/**
 * Art candidates for Matt to choose from, without touching the game's art.
 *
 * `npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--no-ref]`
 * draws `n` new candidates per id with the same prompt and photo reference as
 * `art:gen`, and keeps each full-resolution image as
 * `art-originals/alts/<id>-<k>.png` (k counts on from the last one there).
 * `public/art/` is not touched. Every run then cuts each candidate of the named
 * ids exactly as `art:pick` would into previews (`<sheet>/<id>-<k>.png`) and
 * writes, beside them, a contact sheet (`--sheet=<file>`, default
 * `scratch/art_alts_<date>_<time>.png`: one row per id, the game's current image
 * first, labelled `current`, then every candidate labelled with its `k`, drawn at
 * one scale) and a picker manifest for conductor's picker page (`<sheet>.json`,
 * named after the sheet). `--sheet-only` skips the drawing; `--manifest-only`
 * skips the drawing and the sheet.
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
import { NOTES, PICK_NOTES, refFor } from '../../content/art/prompts.js';
import { isMain } from '../voice/clips.js';
import { ORIGINALS, OUT, codexPrompt, cut, describeUsage, exists, gamePng, isBackground, openPage, refCrop, runCodex } from './generate.js';

export const ALTS = path.join(ORIGINALS, 'alts');

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

/** The game's art for an id now, then each kept candidate cut exactly as `art:pick` would cut it. */
interface Row {
  id: string;
  tiles: { key: string; label?: string; file: string }[];
}

/**
 * Cut every candidate of `ids` the way `art:pick` would (keying, trim, fit,
 * palette shrink) into `<dir>/<id>-<k>.png`; never into `public/art`. A saved
 * original (candidate 0, after a first pick) shows as its committed PNG.
 */
async function previews(page: Page, ids: string[], dir: string): Promise<Row[]> {
  await mkdir(dir, { recursive: true });
  const rows: Row[] = [];
  for (const id of ids) {
    const tiles: Row['tiles'] = [{ key: 'current', file: path.join(OUT, `${id}.png`) }];
    for (const k of await candidates(id)) {
      if (k === 0) {
        const game = altFile(id, '0.game');
        if (await exists(game)) tiles.push({ key: '0', label: 'the original, before the first pick', file: game });
        continue;
      }
      const file = path.join(dir, `${id}-${k}.png`);
      await writeFile(file, (await gamePng(page, id, await readFile(altFile(id, k)))).png);
      tiles.push({ key: String(k), file });
    }
    rows.push({ id, tiles });
  }
  return rows;
}

/**
 * The picker manifest for conductor's picker page: one row per id, `current`
 * first (the default), then the candidates keyed exactly as `art:pick` takes
 * them. Image paths are relative to the manifest; `PICK_NOTES` and the id's
 * NOTES correction become the row's note.
 */
async function altManifest(rows: Row[], file: string, name: string): Promise<void> {
  const dir = path.dirname(file);
  const rel = (f: string) => path.relative(path.resolve(dir), path.resolve(f)).split(path.sep).join('/');
  const manifest = {
    name,
    title: `Art candidates (${name})`,
    intro:
      "One row per image. `current` is the game's art now; each number is a candidate cut exactly as the game would show it (keyed, trimmed, fitted, palette-shrunk). Keeping `current` changes nothing; a number means `npm run art:pick -- <id> <number>`.",
    rows: rows.map((r) => {
      const note = [PICK_NOTES[r.id], NOTES[r.id] && `Asked for this round: ${NOTES[r.id]}`].filter(Boolean).join(' ');
      return {
        id: r.id,
        label: r.id,
        ...(note ? { note } : {}),
        options: r.tiles.map((t) => ({ key: t.key, image: rel(t.file), ...(t.label ? { label: t.label } : {}) })),
      };
    }),
  };
  await mkdir(dir, { recursive: true });
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`art:alts: picker manifest ${file} (${rows.length} rows, ${rows.reduce((n, r) => n + r.tiles.length - 1, 0)} candidates)`);
}

export async function altSheet(rows: Row[], page: Page, file: string): Promise<void> {
  const ids = rows.map((r) => r.id);
  const tiles = async (r: Row) => Promise.all(r.tiles.map(async (t) => ({ label: t.key, src: `data:image/png;base64,${(await readFile(t.file)).toString('base64')}` })));
  const sheetRows = await Promise.all(rows.map(async (r) => ({ id: r.id, tiles: await tiles(r) })));
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
    { rows: sheetRows, wide },
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`art:alts: contact sheet ${file} (${rows.map((r) => `${r.id} ×${r.tiles.length - 1}`).join(', ')})`);
}

export async function alts(argv: string[]): Promise<void> {
  const ids = argv.filter((a) => !a.startsWith('--'));
  if (!ids.length) throw new Error('usage: npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--manifest-only] [--no-ref]');
  for (const id of ids) if (!ART_BY_ID[id]) throw new Error(`${id} is not an asset id (content/art/assets.ts)`);
  const sheet = argv.find((a) => a.startsWith('--sheet='))?.slice('--sheet='.length) ?? defaultSheet();
  const base = sheet.replace(/\.png$/i, '');
  const name = path.basename(base);
  // The name is the picker's URL part and choices file name.
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) throw new Error(`--sheet: ${name} must be a lower-case slug (a-z, 0-9, _ and -), since it names the picker manifest too`);
  const manifestOnly = argv.includes('--manifest-only');
  if (!manifestOnly && !argv.includes('--sheet-only')) await draw(argv);
  const { page, close } = await openPage();
  try {
    const rows = await previews(page, ids, base);
    if (!manifestOnly) await altSheet(rows, page, `${base}.png`);
    await altManifest(rows, `${base}.json`, name);
  } finally {
    await close();
  }
}

/** `scratch/art_alts_<yyyymmdd>_<hhmm>.png`, local time, when no `--sheet` is given. */
function defaultSheet(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return path.join('scratch', `art_alts_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.png`);
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
