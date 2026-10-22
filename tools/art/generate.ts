/**
 * `npm run art:gen -- <ids…> [--force]`: real art from content/art/prompts.ts,
 * drawn by OpenAI Codex's built-in image tool on Matt's ChatGPT login (no API key).
 *
 * One image at a time: `codex exec --json -s read-only` with the prompt on
 * stdin. Codex never writes into the repo; the image it makes lands in
 * `$CODEX_HOME/generated_images/<thread id>/`, and this script collects it from
 * there. The full-resolution original goes to `art-originals/` (git-ignored);
 * a game-sized PNG goes to `public/art/<id>.png`: sprites keyed off green,
 * trimmed and fitted to twice their display box, backgrounds cropped to fill.
 *
 * No ids = every id in ART_PROMPTS. Ids that already have real art (a file
 * without the placeholder mark) are skipped unless `--force`. Stops at the
 * first usage-limit message. Ends by writing scratch/art_contact.png: every
 * prompted id that has real art, not only this run's.
 * `--sheet` only rebuilds the contact sheet; `--reprocess` re-cuts the game
 * PNGs from `art-originals/` without asking Codex (for tuning the keying).
 * `--shrink` palette-quantizes the named ids' committed PNGs in place.
 * `--sheet-out=<file>` writes the contact sheet there, of the named ids only.
 * Family ids (REFS in content/art/prompts.ts) attach a crop of their photo in
 * `art-originals/refs/` as a likeness reference; if that run brings back no
 * image, it is retried with the text alone. `--no-ref` never attaches one.
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { chromium, type Page } from '@playwright/test';
import sharp from 'sharp';

import { ART_BY_ID } from '../../content/art/assets.js';
import { ART_PROMPTS, BACKGROUND_STYLE, keyMode, NOTES, REFS, refFor, spriteStyle, type KeyMode } from '../../content/art/prompts.js';
import { ART_DIR, blankPage, exists, fromDataUrl, pngDataUrl, runMain } from '../shared.js';
import { keyGreen } from './chroma.js';
import { isPlaceholder } from './placeholders.js';

export const ORIGINALS = 'art-originals';
const SHEET = path.join('scratch', 'art_contact.png');
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
const TIMEOUT_MS = 6 * 60_000;
/** Committed art is this many times the display box, so it stays crisp when squashed bigger. */
const SPRITE_SCALE = 2;

/**
 * Committed PNGs are palette-quantized (Matt, 2026-10-18: the batch must stay
 * near 20 MB). Flat cel-shaded art loses nothing visible; a room drops from
 * about 1.8 MB to 0.3 MB and a sprite from about 290 KB to 85 KB.
 */
export const shrinkPng = (png: Buffer): Promise<Buffer> => sharp(png).png({ palette: true, quality: 90, effort: 10, dither: 1 }).toBuffer();

export const isBackground = (id: string) => ['room', 'arena'].includes(ART_BY_ID[id]!.kind);

/** `prompt` replaces the tracked asset prompt (`art:alts --brief`); the style block, photo wording and NOTES stay. */
export function codexPrompt(id: string, withRef = false, prompt = ART_PROMPTS[id]): string {
  if (!prompt) throw new Error(`no prompt for ${id} in content/art/prompts.ts`);
  const a = ART_BY_ID[id];
  if (!a) throw new Error(`${id} is not an asset id (content/art/assets.ts)`);
  // A wide prop (item 027's table, boat, fort) is asked for wide too, so it is not drawn small in a square.
  const shape = isBackground(id) || a.w > a.h * 1.6 ? 'wide landscape' : a.h > a.w * 1.1 ? 'portrait' : 'square';
  return [
    'Use your built-in image_gen tool ($imagegen) exactly once to generate the image below.',
    'Do not read any files, run any commands, or try to save the image anywhere: just generate it, then stop.',
    `Image shape: ${shape}.`,
    ...(withRef
      ? [
          '',
          REFS[refFor(id)!]!.style
            ? `The attached picture is a style reference only: ${REFS[refFor(id)!]!.who}. Take its chunky armour and general feel, and its colours unless the description below gives others, and draw an original character of your own design as described below, as a flat, simple cartoon with thick outlines, not a 3D render. Do not copy the picture's design, proportions, pose or background.`
            : `The attached photo is a likeness reference only, for ${REFS[refFor(id)!]!.who}. Draw that person as the cartoon character below: keep their face shape, hair, eye colour, skin tone, glasses and beard as in the photo, simplified into the style: a flat, simple cartoon with thick outlines, not a realistic painting. Do not copy the photo's clothes, pose or background, and draw nobody else from it.`,
        ]
      : []),
    '',
    `${isBackground(id) ? BACKGROUND_STYLE : spriteStyle(id)} ${prompt}`,
    ...(NOTES[id] ? ['', `Important: ${NOTES[id]}`] : []),
  ].join('\n');
}

interface CodexRun {
  thread?: string;
  image?: string;
  seconds: number;
  limit?: string;
  lastMessage?: string;
  usage?: unknown;
}

export async function runCodex(prompt: string, image?: string): Promise<CodexRun> {
  const workdir = path.resolve('scratch', 'codex');
  await mkdir(workdir, { recursive: true });
  const started = Date.now();
  // codex is an npm .cmd shim on Windows, which Node only spawns through a shell.
  // The command line is fixed; the prompt goes on stdin, so nothing of it is shell-expanded.
  const child = spawn(`codex exec ${image ? `-i "${image}" ` : ''}--json --skip-git-repo-check -s read-only -C "${workdir}" -`, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.end(prompt);
  let out = '';
  let err = '';
  child.stdout.on('data', (d: Buffer) => (out += d.toString('utf8')));
  child.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')));
  const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
  const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
  clearTimeout(timer);
  const run: CodexRun = { seconds: Math.round((Date.now() - started) / 100) / 10 };

  for (const line of out.split('\n')) {
    let ev: { type?: string; thread_id?: string; item?: { type?: string; text?: string }; message?: string; error?: { message?: string } };
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === 'thread.started') run.thread = ev.thread_id;
    if (ev.item?.type === 'agent_message' && ev.item.text) run.lastMessage = ev.item.text.trim();
    const msg = ev.message ?? ev.error?.message;
    if ((ev.type === 'error' || ev.type === 'turn.failed') && msg) run.lastMessage = msg;
  }
  const limitText = `${run.lastMessage ?? ''}\n${err}`.match(/[^\n]*(usage limit|rate limit|limit reached|try again (at|in))[^\n]*/i);
  if (limitText) run.limit = limitText[0].trim();

  if (run.thread) {
    const dir = path.join(CODEX_HOME, 'generated_images', run.thread);
    if (await exists(dir)) {
      const pngs = (await readdir(dir)).filter((f) => f.endsWith('.png'));
      const withTimes = await Promise.all(pngs.map(async (f) => ({ f, t: (await stat(path.join(dir, f))).mtimeMs })));
      const newest = withTimes.sort((p, q) => q.t - p.t)[0];
      if (newest) run.image = path.join(dir, newest.f);
    }
    run.usage = await rateLimits(run.thread);
  }
  if (!run.image && code !== 0 && !run.lastMessage) run.lastMessage = `codex exited ${code}: ${err.trim().split('\n').slice(-3).join(' | ')}`;
  return run;
}

/** The allowance Codex logged for this thread (the last `rate_limits` in its session file). Nothing else is read. */
async function rateLimits(thread: string): Promise<unknown> {
  const root = path.join(CODEX_HOME, 'sessions');
  const find = async (dir: string): Promise<string | undefined> => {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const hit = await find(p);
        if (hit) return hit;
      } else if (e.name.endsWith(`${thread}.jsonl`)) return p;
    }
    return undefined;
  };
  const file = await find(root);
  if (!file) return undefined;
  let last: unknown;
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    if (!line.includes('"rate_limits"')) continue;
    try {
      const rl = JSON.parse(line)?.payload?.rate_limits;
      if (rl) last = rl;
    } catch {
      /* partial line */
    }
  }
  return last;
}

export function describeUsage(u: unknown): string {
  const r = u as { primary?: { used_percent?: number; window_minutes?: number }; secondary?: { used_percent?: number; window_minutes?: number }; plan_type?: string; rate_limit_reached_type?: string | null } | undefined;
  if (!r) return 'no allowance logged';
  const w = (x?: { used_percent?: number; window_minutes?: number }) => (x ? `${x.used_percent ?? '?'}% of ${Math.round((x.window_minutes ?? 0) / 60)}h` : '?');
  return `${r.plan_type ?? '?'}: used ${w(r.primary)}, ${w(r.secondary)}${r.rate_limit_reached_type ? `, LIMIT ${r.rate_limit_reached_type}` : ''}`;
}

// -- image processing (in a page: canvas decodes, scales and encodes PNG) -------

export async function openPage(): Promise<{ page: Page; close: () => Promise<void> }> {
  const browser = await chromium.launch();
  const page = await blankPage(browser);
  await page.addScriptTag({ content: `window.keyGreen = ${keyGreen.toString()};` });
  return { page, close: () => browser.close() };
}

export interface Processed {
  url: string;
  w: number;
  h: number;
  srcW: number;
  srcH: number;
  fringe: number;
}

export async function processImage(page: Page, png: Buffer, opts: { sprite: boolean; boxW: number; boxH: number; mode: KeyMode }): Promise<Processed> {
  return page.evaluate(
    async ({ src, sprite, boxW, boxH, mode }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const full = document.createElement('canvas');
      full.width = sw;
      full.height = sh;
      const fc = full.getContext('2d')!;
      fc.drawImage(img, 0, 0);
      const out = document.createElement('canvas');
      const oc = out.getContext('2d')!;
      oc.imageSmoothingQuality = 'high';
      let fringe = 0;
      if (sprite) {
        const data = fc.getImageData(0, 0, sw, sh);
        fringe = (window as unknown as { keyGreen: (p: Uint8ClampedArray, w: number, h: number, m: string) => { fringe: number } }).keyGreen(data.data, sw, sh, mode).fringe;
        fc.putImageData(data, 0, 0);
        let x0 = sw;
        let y0 = sh;
        let x1 = -1;
        let y1 = -1;
        for (let y = 0; y < sh; y++)
          for (let x = 0; x < sw; x++)
            if (data.data[(y * sw + x) * 4 + 3]! > 8) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
        if (x1 < 0) throw new Error('keying left nothing visible');
        const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
        x0 = Math.max(0, x0 - pad);
        y0 = Math.max(0, y0 - pad);
        x1 = Math.min(sw - 1, x1 + pad);
        y1 = Math.min(sh - 1, y1 + pad);
        const cw = x1 - x0 + 1;
        const ch = y1 - y0 + 1;
        const s = Math.min(boxW / cw, boxH / ch, 1);
        out.width = Math.round(cw * s);
        out.height = Math.round(ch * s);
        oc.drawImage(full, x0, y0, cw, ch, 0, 0, out.width, out.height);
      } else {
        out.width = boxW;
        out.height = boxH;
        const s = Math.max(boxW / sw, boxH / sh);
        const cw = boxW / s;
        const ch = boxH / s;
        oc.drawImage(full, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, boxW, boxH);
      }
      return { url: out.toDataURL('image/png'), w: out.width, h: out.height, srcW: sw, srcH: sh, fringe };
    },
    { src: pngDataUrl(png), ...opts },
  );
}

async function contactSheet(page: Page, ids: string[], sheet = SHEET): Promise<void> {
  const tiles = await Promise.all(ids.map(async (id) => ({ id, src: pngDataUrl(await readFile(path.join(ART_DIR, `${id}.png`))) })));
  const url = await page.evaluate(async (list) => {
    const T = 360;
    const L = 40;
    const cols = Math.min(3, list.length);
    const rows = Math.ceil(list.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * T;
    cv.height = rows * (T + L);
    const c = cv.getContext('2d')!;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, cv.width, cv.height);
    for (const [k, t] of list.entries()) {
      const x = (k % cols) * T;
      const y = Math.floor(k / cols) * (T + L);
      for (let i = 0; i < T / 20; i++) for (let j = 0; j < T / 20; j++) {
        c.fillStyle = (i + j) % 2 ? '#d8d8d8' : '#f4f4f4';
        c.fillRect(x + i * 20, y + j * 20, 20, 20);
      }
      const img = new Image();
      img.src = t.src;
      await img.decode();
      const s = Math.min((T - 16) / img.naturalWidth, (T - 16) / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      c.drawImage(img, x + (T - w) / 2, y + (T - h) / 2, w, h);
      c.fillStyle = '#222';
      c.font = 'bold 20px monospace';
      c.textAlign = 'center';
      c.fillText(`${t.id}  ${img.naturalWidth}×${img.naturalHeight}`, x + T / 2, y + T + 27);
    }
    return cv.toDataURL('image/png');
  }, tiles);
  await mkdir(path.dirname(sheet), { recursive: true });
  await writeFile(sheet, fromDataUrl(url));
  console.log(`art: contact sheet ${sheet} (${ids.length} tiles)`);
}

/** The game-sized PNG for an id from a full-resolution original: keyed, trimmed, fitted and shrunk. */
export async function gamePng(page: Page, id: string, original: Buffer): Promise<{ png: Buffer; p: Processed }> {
  const a = ART_BY_ID[id]!;
  const sprite = !isBackground(id);
  const scale = sprite ? SPRITE_SCALE : 1;
  const p = await processImage(page, original, { sprite, boxW: a.w * scale, boxH: a.h * scale, mode: keyMode(id) });
  return { png: await shrinkPng(fromDataUrl(p.url)), p };
}

/** Write the game-sized `public/art/<id>.png` from a full-resolution original. */
export async function cut(page: Page, id: string, original: Buffer, note: string): Promise<void> {
  const sprite = !isBackground(id);
  const { png, p } = await gamePng(page, id, original);
  await writeFile(path.join(ART_DIR, `${id}.png`), png);
  console.log(`art: ${id}: ${p.srcW}×${p.srcH} → ${p.w}×${p.h} (${Math.round(png.length / 1024)} KB)${sprite ? `, green fringe px ${p.fringe}` : ''}${note ? `; ${note}` : ''}`);
}

async function isReal(id: string): Promise<boolean> {
  const f = path.join(ART_DIR, `${id}.png`);
  return (await exists(f)) && !isPlaceholder(await readFile(f));
}

/** The cropped likeness photo for a family id, cut from `art-originals/refs/` (absolute path), or undefined. */
export async function refCrop(id: string): Promise<string | undefined> {
  const c = refFor(id);
  if (!c) return undefined;
  const r = REFS[c]!;
  const src = path.join(ORIGINALS, 'refs', r.photo);
  if (!(await exists(src))) return undefined;
  const out = path.resolve(ORIGINALS, 'refs', 'crops', `${c}.png`);
  await mkdir(path.dirname(out), { recursive: true });
  const [left, top, width, height] = r.box;
  await sharp(src).extract({ left, top, width, height }).toFile(out);
  return out;
}

export async function generate(argv: string[]): Promise<void> {
  const force = argv.includes('--force');
  const sheetOnly = argv.includes('--sheet');
  const reprocess = argv.includes('--reprocess');
  const shrink = argv.includes('--shrink');
  const sheetOut = argv.find((a) => a.startsWith('--sheet-out='))?.slice('--sheet-out='.length);
  const noRef = argv.includes('--no-ref');
  const named = argv.filter((a) => !a.startsWith('--'));
  const ids = named.length ? named : Object.keys(ART_PROMPTS);
  for (const id of ids) codexPrompt(id); // fail before spending anything on a bad id

  await mkdir(ORIGINALS, { recursive: true });
  const { page, close } = await openPage();
  try {
    if (shrink) {
      for (const id of ids) {
        const f = path.join(ART_DIR, `${id}.png`);
        const before = await readFile(f);
        const after = await shrinkPng(before);
        await writeFile(f, after);
        console.log(`art: ${id}: ${Math.round(before.length / 1024)} KB → ${Math.round(after.length / 1024)} KB`);
      }
    } else if (reprocess) {
      for (const id of ids) {
        const orig = path.join(ORIGINALS, `${id}.png`);
        if (await exists(orig)) await cut(page, id, await readFile(orig), '');
        else console.log(`art: ${id}: no original in ${ORIGINALS}/, skipped`);
      }
    } else if (!sheetOnly) {
      for (const [k, id] of ids.entries()) {
        if (!force && (await isReal(id))) {
          console.log(`art: ${id} already has real art, skipped (--force to redo)`);
          continue;
        }
        console.log(`art: [${k + 1}/${ids.length}] ${id}: asking codex…`);
        const ref = noRef ? undefined : await refCrop(id);
        const log = (r: CodexRun, withRef: boolean) =>
          appendFile(path.join(ORIGINALS, 'log.jsonl'), `${JSON.stringify({ id, at: new Date().toISOString(), ref: withRef, seconds: r.seconds, thread: r.thread, image: r.image, limit: r.limit, usage: r.usage, message: r.lastMessage })}\n`);
        let run = await runCodex(codexPrompt(id, !!ref), ref);
        await log(run, !!ref);
        let usedRef = !!ref && !!run.image;
        if (ref && !run.image && !run.limit) {
          console.error(`art: ${id}: no image with the photo reference (${run.lastMessage ?? '?'}); retrying with text alone`);
          run = await runCodex(codexPrompt(id));
          await log(run, false);
          usedRef = false;
        }
        if (run.image && refFor(id)) console.log(`art: ${id}: drawn ${usedRef ? 'with' : 'without'} a photo reference`);
        if (!run.image) {
          console.error(`art: ${id}: no image after ${run.seconds}s. ${run.limit ?? run.lastMessage ?? ''}`);
          if (run.limit) break;
          continue;
        }
        await copyFile(run.image, path.join(ORIGINALS, `${id}.png`));
        await cut(page, id, await readFile(run.image), `${run.seconds}s, ${describeUsage(run.usage)}`);
        if (run.limit) {
          console.error(`art: usage limit: ${run.limit}`);
          break;
        }
      }
    }
    const done: string[] = [];
    for (const id of Object.keys(ART_PROMPTS)) if (await isReal(id)) done.push(id);
    if (sheetOut) {
      const mine: string[] = [];
      for (const id of ids) if (await isReal(id)) mine.push(id);
      if (mine.length) await contactSheet(page, mine, sheetOut);
    } else if (done.length) await contactSheet(page, done);
  } finally {
    await close();
  }
}

runMain(import.meta.url, () => generate(process.argv.slice(2)), 'art:gen failed: ');
