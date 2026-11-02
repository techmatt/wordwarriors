/**
 * `npm run art:freeform -- <spec.json> [--n=3] [--jobs=4] [--manifest-only]`: candidate
 * images that are not the game's art, for a picker, through the same Codex route as
 * `art:gen`. Nothing here reads `content/art` or writes `public/`: the spec, and all
 * that is drawn from it, stay in the spec's folder (put it under `art-originals/`, which
 * is git-ignored and shared).
 *
 * The spec names each row's shape, exact aspect and prompt (README, *Images outside the
 * game*). Beside it: `originals/<id>-<k>.png` as drawn, `<id>-<k>.png` centre-cropped to
 * the row's aspect, `sheets/<id>.png` a row's candidates side by side for checking, the
 * picker manifest `<name>.json` and `log.jsonl`.
 *
 * A run draws only the candidates that are missing, so moving a bad one out of the
 * folder and running again redraws that one under the same key.
 *
 * A spec with `key` draws on a key-colour screen and cuts each candidate as a game sprite
 * is cut (keyed, trimmed, fitted); a row with `looks` draws a different brief per
 * candidate (README, *Images outside the game*). `--recut` cuts again from `originals/`.
 */

import { appendFile, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { exists, runMain } from '../shared.js';
import type { KeyMode } from '../../content/art/prompts.js';
import { askOnce, describeUsage, openPage, runCodex, spriteCut } from './generate.js';

export interface FreeformRow {
  id: string;
  label: string;
  note?: string;
  /** The words the image tool takes its shape from, e.g. `portrait`. */
  shape: string;
  /** Width and height of the cut, e.g. [3, 4]. */
  aspect: [number, number];
  prompt: string;
  /** An image that already exists, the row's first option and default (`image` relative to the spec). */
  current?: FreeformOption;
  /** Images that already exist, after the row's candidates: an earlier batch shown beside them. */
  more?: FreeformOption[];
  /** One brief per candidate, added after `prompt`; each is drawn `--n` times and labelled in the picker. */
  looks?: FreeformLook[];
  /** The picker's keep-or-drop row; `default` is the keys kept to start with. */
  kind?: 'many';
  default?: string[];
}

interface FreeformLook {
  label: string;
  prompt: string;
}

interface FreeformOption {
  key: string;
  image: string;
  label?: string;
}

export interface FreeformSpec {
  name: string;
  title: string;
  intro?: string;
  /** Put before every row's prompt. */
  style: string;
  rows: FreeformRow[];
  /** Cut as sprites: `mode` as in `keyGreen`, `box` the fit in pixels (twice the game's display box). */
  key?: { mode: KeyMode; box: { w: number; h: number } };
}

/** What a run does with an original: a keyed spec's cut, or the row's centred crop. */
type Cutter = (row: FreeformRow, tag: string) => Promise<void>;

/** The look candidate `k` (from 1) of a row is drawn from. */
export const lookOf = (row: FreeformRow, k: number): FreeformLook | undefined => (row.looks?.length ? row.looks[(k - 1) % row.looks.length] : undefined);

/** The centred box of a `w`×`h` image at `aspect`. */
export function centreCrop(w: number, h: number, [aw, ah]: [number, number]): { left: number; top: number; width: number; height: number } {
  const width = Math.min(w, Math.round((h * aw) / ah));
  const height = Math.min(h, Math.round((w * ah) / aw));
  return { left: Math.floor((w - width) / 2), top: Math.floor((h - height) / 2), width, height };
}

/** More than a quarter off the aspect: the crop would lose too much of the picture (2:3 for 3:4 is fine, 2.3:1 for 4:3 is not). */
export function tooFarOff(w: number, h: number, [aw, ah]: [number, number]): boolean {
  const off = (w / h) * (ah / aw);
  return Math.max(off, 1 / off) > 1.25;
}

async function candidates(dir: string, id: string): Promise<number[]> {
  const re = new RegExp(`^${id}-(\\d+)\\.png$`);
  const hits = (await readdir(dir)).map((f) => f.match(re)?.[1]).filter((k): k is string => k !== undefined);
  return hits.map(Number).sort((a, b) => a - b);
}

function cutter(spec: FreeformSpec, dir: string, page: Awaited<ReturnType<typeof openPage>>['page'] | undefined): Cutter {
  return async (row, tag) => {
    const original = path.join(dir, 'originals', `${tag}.png`);
    const out = path.join(dir, `${tag}.png`);
    if (spec.key && page) {
      const { png, w, h, fringe } = await spriteCut(page, await readFile(original), spec.key.box, spec.key.mode);
      await writeFile(out, png);
      console.log(`art:freeform: ${tag}: cut ${w}×${h}, fringe px ${fringe}`);
      return;
    }
    const { width: w = 0, height: h = 0 } = await sharp(original).metadata();
    await sharp(original).extract(centreCrop(w, h, row.aspect)).png().toFile(out);
  };
}

async function draw(spec: FreeformSpec, dir: string, n: number, jobs: number, cut: Cutter): Promise<void> {
  const todo: { row: FreeformRow; k: number }[] = [];
  for (const row of spec.rows) {
    const have = await candidates(dir, row.id);
    const count = n * (row.looks?.length || 1);
    for (let k = 1; k <= count; k++) if (!have.includes(k)) todo.push({ row, k });
  }
  console.log(`art:freeform: ${todo.length} to draw`);
  let stopped = false;
  const one = async ({ row, k }: (typeof todo)[number]): Promise<void> => {
    const tag = `${row.id}-${k}`;
    for (let attempt = 1; attempt <= 2 && !stopped; attempt++) {
      const run = await runCodex([...askOnce(row.shape), '', [spec.style, row.prompt, lookOf(row, k)?.prompt].filter(Boolean).join(' ')].join('\n'));
      await appendFile(path.join(dir, 'log.jsonl'), `${JSON.stringify({ tag, at: new Date().toISOString(), seconds: run.seconds, thread: run.thread, limit: run.limit, usage: run.usage, message: run.lastMessage })}\n`);
      if (run.limit) stopped = true;
      if (!run.image) {
        console.error(`art:freeform: ${tag}: no image (${run.limit ?? run.lastMessage ?? '?'})`);
        continue;
      }
      const { width: w = 0, height: h = 0 } = await sharp(run.image).metadata();
      if (tooFarOff(w, h, row.aspect)) {
        console.error(`art:freeform: ${tag}: drawn ${w}×${h}, too far from ${row.aspect.join(':')}; dropped`);
        continue;
      }
      const original = path.join(dir, 'originals', `${tag}.png`);
      await copyFile(run.image, original);
      await cut(row, tag);
      console.log(`art:freeform: ${tag}: ${w}×${h}, ${run.seconds}s, ${describeUsage(run.usage)}`);
      return;
    }
  };
  await Promise.all(
    Array.from({ length: jobs }, async () => {
      for (let job = todo.shift(); job && !stopped; job = todo.shift()) await one(job);
    }),
  );
}

/** A row's candidates side by side, at a size a person (or agent) can check for stray text. */
async function sheets(spec: FreeformSpec, dir: string): Promise<void> {
  const out = path.join(dir, 'sheets');
  await mkdir(out, { recursive: true });
  for (const row of spec.rows) {
    const [aw, ah] = row.aspect;
    const height = aw > ah ? 600 : 800;
    const width = Math.round((height * aw) / ah);
    const ks = await candidates(dir, row.id);
    if (!ks.length) continue;
    const tile = (k: number) => sharp(path.join(dir, `${row.id}-${k}.png`)).resize(width, height, { fit: 'contain', background: '#cfd8dc' }).flatten({ background: '#cfd8dc' }).png().toBuffer();
    const tiles = await Promise.all(ks.map(tile));
    const canvas = { width: ks.length * (width + 8), height, channels: 3 as const, background: '#fff' };
    await sharp({ create: canvas })
      .composite(tiles.map((input, i) => ({ input, left: i * (width + 8), top: 0 })))
      .png()
      .toFile(path.join(out, `${row.id}.png`));
  }
}

async function manifest(spec: FreeformSpec, dir: string): Promise<void> {
  const rows = await Promise.all(
    spec.rows.map(async (row) => {
      const { id, label, note, current, more, kind } = row;
      const option = (k: number) => {
        const look = lookOf(row, k);
        return { key: String(k), image: `${id}-${k}.png`, ...(look ? { label: look.label } : {}) };
      };
      return {
        id,
        label,
        ...(note ? { note } : {}),
        ...(kind ? { kind, default: row.default ?? [] } : {}),
        options: [...(current ? [current] : []), ...(await candidates(dir, id)).map(option), ...(more ?? [])],
      };
    }),
  );
  const file = path.join(dir, `${spec.name}.json`);
  await writeFile(file, `${JSON.stringify({ name: spec.name, title: spec.title, ...(spec.intro ? { intro: spec.intro } : {}), rows }, null, 2)}\n`);
  console.log(`art:freeform: picker manifest ${file}: ${rows.map((r) => `${r.id} ×${r.options.length}`).join(', ')}`);
}

export async function freeform(argv: string[]): Promise<void> {
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file || !(await exists(file)) || !(await stat(file)).isFile()) throw new Error('usage: npm run art:freeform -- <spec.json> [--n=3] [--jobs=4] [--manifest-only] [--recut]');
  const flag = (name: string, fallback: number) => Number(argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback);
  const spec = JSON.parse(await readFile(file, 'utf8')) as FreeformSpec;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spec.name ?? '')) throw new Error('the spec needs a lower-case slug `name`, since it names the picker manifest');
  const dir = path.dirname(file);
  await mkdir(path.join(dir, 'originals'), { recursive: true });
  const opened = spec.key && !argv.includes('--manifest-only') ? await openPage() : undefined;
  try {
    const cut = cutter(spec, dir, opened?.page);
    if (argv.includes('--recut')) for (const row of spec.rows) for (const k of await candidates(path.join(dir, 'originals'), row.id)) await cut(row, `${row.id}-${k}`);
    else if (!argv.includes('--manifest-only')) await draw(spec, dir, flag('n', 3), flag('jobs', 4), cut);
  } finally {
    await opened?.close();
  }
  await sheets(spec, dir);
  await manifest(spec, dir);
}

runMain(import.meta.url, () => freeform(process.argv.slice(2)), 'art:freeform failed: ');
