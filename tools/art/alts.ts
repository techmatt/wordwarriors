/**
 * Art candidates for Matt to choose from, without touching the game's art.
 *
 * `npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--no-ref] [--brief=<file>]`
 * draws `n` new candidates per id with the same prompt and photo reference as
 * `art:gen`, and keeps each full-resolution image as
 * `art-originals/alts/<id>-<k>.png` (k counts on from the last one there).
 * `--brief=<file>` (one id only; a text file in `scratch/`, item 041) draws from
 * that file's text instead of the tracked prompt, with the same style block,
 * photo reference and NOTES, so trying a new look edits nothing tracked. Each
 * such candidate gets a sidecar `<id>-<k>.json` (the brief's name, its file and
 * text, the whole prompt), and the sheet and picker label it with the name.
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
 * `art-originals/restore/<id>.png` (the full-res original, if any) and
 * `<id>.game.png` (the committed PNG), so `art:pick -- <id> 0` puts the
 * original art back. A pick then deletes every candidate of that id in
 * `alts/` (item 052): what the game and `--reprocess` need lives outside it.
 */

import { appendFile, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';

import { ART_BY_ID } from '../../content/art/assets.js';
import { NOTES, PICK_NOTES, refFor } from '../../content/art/prompts.js';
import { ART_DIR, exists, fromDataUrl, pngDataUrl, runMain } from '../shared.js';
import { ORIGINALS, codexPrompt, cut, describeUsage, gamePng, isBackground, openPage, refCrop, runCodex } from './generate.js';

const ALTS =path.join(ORIGINALS, 'alts');
/** What the game had before an id's first pick, for `art:pick -- <id> 0`. */
const RESTORE =path.join(ORIGINALS, 'restore');

const altFile = (id: string, k: number) => path.join(ALTS, `${id}-${k}.png`);
const sidecarFile = (id: string, k: number) => path.join(ALTS, `${id}-${k}.json`);
const restoreFile = (id: string) => path.join(RESTORE, `${id}.png`);
const restoreGame = (id: string) => path.join(RESTORE, `${id}.game.png`);

/** A brief (`--brief=<file>`): its name is the file's base name, its text the whole file, whitespace collapsed. */
export interface Brief {
  name: string;
  file: string;
  text: string;
}

export async function readBrief(file: string): Promise<Brief> {
  const name = path.basename(file).replace(/\.[a-z]+$/i, '');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) throw new Error(`--brief: ${name} must be a lower-case slug (a-z, 0-9, _ and -), since it labels the candidates`);
  const text = (await readFile(file, 'utf8')).replace(/\s+/g, ' ').trim();
  if (!text) throw new Error(`--brief: ${file} is empty`);
  return { name, file: file.split(path.sep).join('/'), text };
}

/** What a candidate drawn from a brief was drawn from, beside its image. */
export interface Sidecar extends Brief {
  id: string;
  k: number;
  at: string;
  ref: boolean;
  prompt: string;
}

async function sidecar(id: string, k: number): Promise<Sidecar | undefined> {
  const f = sidecarFile(id, k);
  return (await exists(f)) ? (JSON.parse(await readFile(f, 'utf8')) as Sidecar) : undefined;
}

/** The candidate numbers kept for an id, ascending. */
export async function candidates(id: string): Promise<number[]> {
  const files = await readdir(ALTS).catch(() => [] as string[]);
  const re = new RegExp(`^${id}-(\\d+)\\.png$`);
  return files
    .map((f) => f.match(re)?.[1])
    .filter((k): k is string => k !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Delete every candidate of an id (images and brief sidecars): once one is promoted the rest are disposable. */
async function prune(id: string): Promise<number> {
  const files = await readdir(ALTS).catch(() => [] as string[]);
  const re = new RegExp(`^${id}-\\d+\\.(png|json)$`);
  const gone = files.filter((f) => re.test(f));
  for (const f of gone) await rm(path.join(ALTS, f));
  return gone.filter((f) => f.endsWith('.png')).length;
}

async function draw(argv: string[]): Promise<void> {
  const n = Number(argv.find((a) => a.startsWith('--n='))?.slice(4) ?? 3);
  const noRef = argv.includes('--no-ref');
  const ids = argv.filter((a) => !a.startsWith('--'));
  const briefArg = argv.find((a) => a.startsWith('--brief='))?.slice('--brief='.length);
  const brief = briefArg ? await readBrief(briefArg) : undefined;
  if (brief && ids.length !== 1) throw new Error('--brief draws one id: one run per brief');
  const prompt = (id: string, withRef = false) => codexPrompt(id, withRef, brief?.text);
  for (const id of ids) prompt(id); // fail before spending anything on a bad id
  await mkdir(ALTS, { recursive: true });
  for (const id of ids) {
    const ref = noRef ? undefined : await refCrop(id);
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, ...(await candidates(id))) + 1;
      console.log(`art:alts: ${id} candidate ${k} (${i + 1}/${n}): asking codex…`);
      const log = (r: Awaited<ReturnType<typeof runCodex>>, withRef: boolean) =>
        appendFile(path.join(ORIGINALS, 'log.jsonl'), `${JSON.stringify({ id, alt: k, ...(brief ? { brief: brief.name } : {}), at: new Date().toISOString(), ref: withRef, seconds: r.seconds, thread: r.thread, image: r.image, limit: r.limit, usage: r.usage, message: r.lastMessage })}\n`);
      let withRef = !!ref;
      let run = await runCodex(prompt(id, withRef), ref);
      await log(run, withRef);
      if (ref && !run.image && !run.limit) {
        console.error(`art:alts: ${id}: no image with the photo reference (${run.lastMessage ?? '?'}); retrying with text alone`);
        withRef = false;
        run = await runCodex(prompt(id));
        await log(run, false);
      }
      const keep = async (image: string) => {
        await copyFile(image, altFile(id, k));
        if (brief) {
          const side: Sidecar = { id, k, ...brief, at: new Date().toISOString(), ref: withRef, prompt: prompt(id, withRef) };
          await writeFile(sidecarFile(id, k), `${JSON.stringify(side, null, 2)}\n`);
        }
      };
      if (run.limit) {
        console.error(`art:alts: usage limit: ${run.limit}`);
        if (run.image) await keep(run.image);
        return;
      }
      if (!run.image) {
        console.error(`art:alts: ${id}: no image after ${run.seconds}s. ${run.lastMessage ?? ''}`);
        continue;
      }
      await keep(run.image);
      console.log(`art:alts: ${id}-${k}: ${run.seconds}s${refFor(id) ? (withRef ? ', with photo' : ', text only') : ''}${brief ? `, brief ${brief.name}` : ''}, ${describeUsage(run.usage)}`);
    }
  }
}

/** The game's art for an id now, then each kept candidate cut exactly as `art:pick` would cut it. */
interface Row {
  id: string;
  tiles: { key: string; label?: string; brief?: string; file: string }[];
}

/**
 * Cut every candidate of `ids` the way `art:pick` would (keying, trim, fit,
 * palette shrink) into `<dir>/<id>-<k>.png`; never into `public/art`. A saved
 * original (`restore/`, after a first pick) shows as `0`, its committed PNG.
 */
async function previews(page: Page, ids: string[], dir: string): Promise<Row[]> {
  await mkdir(dir, { recursive: true });
  const rows: Row[] = [];
  for (const id of ids) {
    const tiles: Row['tiles'] = [{ key: 'current', file: path.join(ART_DIR, `${id}.png`) }];
    if (await exists(restoreGame(id))) tiles.push({ key: '0', label: 'the original, before the first pick', file: restoreGame(id) });
    for (const k of await candidates(id)) {
      const file = path.join(dir, `${id}-${k}.png`);
      await writeFile(file, (await gamePng(page, id, await readFile(altFile(id, k)))).png);
      const b = await sidecar(id, k);
      tiles.push({ key: String(k), file, ...(b ? { label: `brief ${b.name}`, brief: b.name } : {}) });
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
      const note = [PICK_NOTES[r.id], NOTES[r.id] && `Asked for this round: ${NOTES[r.id]}`, briefNote(r)].filter(Boolean).join(' ');
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

/** "Drawn from briefs …: 4, 5 netrunner; 6 drones." for a row with candidates drawn from briefs. */
function briefNote(r: Row): string | undefined {
  const by = new Map<string, string[]>();
  for (const t of r.tiles) if (t.brief) by.set(t.brief, [...(by.get(t.brief) ?? []), t.key]);
  if (!by.size) return undefined;
  return `Drawn from briefs, not the game's prompt (art:alts --brief; promoting one writes its brief into the game): ${[...by].map(([b, ks]) => `${ks.join(', ')} ${b}`).join('; ')}.`;
}

async function altSheet(rows: Row[], page: Page, file: string): Promise<void> {
  const ids = rows.map((r) => r.id);
  const tiles = async (r: Row) => Promise.all(r.tiles.map(async (t) => ({ label: t.key, brief: t.brief ?? '', src: pngDataUrl(await readFile(t.file)) })));
  const sheetRows = await Promise.all(rows.map(async (r) => ({ id: r.id, tiles: await tiles(r) })));
  const wide = ids.some(isBackground);
  const url = await page.evaluate(
    async ({ rows, wide }) => {
      const TW = wide ? 480 : 300;
      const TH = wide ? 270 : 300;
      const L = rows.some((r) => r.tiles.some((t) => t.brief)) ? 56 : 34;
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
          if (t.brief) {
            c.fillStyle = '#333';
            c.font = '15px monospace';
            c.fillText(t.brief, x + TW / 2, y + TH + 48, TW - 8);
          }
        }
      }
      return cv.toDataURL('image/png');
    },
    { rows: sheetRows, wide },
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, fromDataUrl(url));
  console.log(`art:alts: contact sheet ${file} (${rows.map((r) => `${r.id} ×${r.tiles.length - 1}`).join(', ')})`);
}

export async function alts(argv: string[]): Promise<void> {
  const ids = argv.filter((a) => !a.startsWith('--'));
  if (!ids.length) throw new Error('usage: npm run art:alts -- <ids…> [--n=3] [--sheet=<file>] [--sheet-only] [--manifest-only] [--no-ref] [--brief=<file>]');
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

const pruned = (n: number) => (n ? `; deleted its ${n} candidate${n === 1 ? '' : 's'} in ${ALTS}/` : '');

export async function pick(argv: string[]): Promise<void> {
  const [id, kArg] = argv.filter((a) => !a.startsWith('--'));
  if (!id || kArg === undefined || !/^\d+$/.test(kArg)) throw new Error('usage: npm run art:pick -- <id> <n>   (n from the contact sheet; 0 puts the original back)');
  if (!ART_BY_ID[id]) throw new Error(`${id} is not an asset id (content/art/assets.ts)`);
  const k = Number(kArg);
  const game = path.join(ART_DIR, `${id}.png`);
  const orig = path.join(ORIGINALS, `${id}.png`);
  if (k === 0) {
    if (!(await exists(restoreGame(id)))) throw new Error(`${id} has no saved original (${restoreGame(id)}): it was never picked`);
    // The original's committed PNG, byte for byte (a placeholder has no full-res original).
    await copyFile(restoreGame(id), game);
    if (await exists(restoreFile(id))) await copyFile(restoreFile(id), orig);
    console.log(`art:pick: ${id}: the original is back${pruned(await prune(id))}`);
    return;
  }
  const src = altFile(id, k);
  if (!(await exists(src))) throw new Error(`no candidate ${src}; have ${(await candidates(id)).join(', ') || 'none'}`);
  // The first pick keeps what was there, outside alts/, so it can come back.
  // A placeholder has no full-res original, only its committed PNG.
  if (!(await exists(restoreGame(id)))) {
    await mkdir(RESTORE, { recursive: true });
    if (await exists(orig)) await copyFile(orig, restoreFile(id));
    await copyFile(game, restoreGame(id));
    console.log(`art:pick: kept the original ${id} in ${RESTORE}/`);
  }
  // The full-res pick goes where --reprocess reads it before alts/ is pruned.
  await copyFile(src, orig);
  const { page, close } = await openPage();
  try {
    await cut(page, id, await readFile(src), `candidate ${k}`);
  } finally {
    await close();
  }
  const b = await sidecar(id, k);
  console.log(`art:pick: ${id}${pruned(await prune(id))}`);
  if (b) {
    // The game's prompt must match its art, so art:gen and later rounds draw the same look (item 041).
    console.log(`\nart:pick: ${id}-${k} was drawn from brief ${b.name} (${b.file}), not the game's prompt. Write the brief into the game in the same commit:`);
    console.log('  a character: its `look` in content/battle/roster.ts (its prompt is derived from that, and docs/art.md follows);');
    console.log(`  anything else: a HAND entry for ${id} in content/art/prompts.ts.`);
    console.log(`\n${b.text}\n`);
  }
}

// package.json runs this file with `alts` or `pick` first.
const isPick = process.argv[2] === 'pick';
runMain(import.meta.url, () => (isPick ? pick(process.argv.slice(3)) : alts(process.argv.slice(3))), `art:${isPick ? 'pick' : 'alts'} failed: `);
