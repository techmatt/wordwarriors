/**
 * Helpers every tool shares, art and voice alike, so neither imports the other's
 * modules for them.
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Browser, Page } from '@playwright/test';

import type { LineSpec } from './voice/types.js';

/** Was this module the one that was run, rather than imported? */
export function isMain(url: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry!) === path.resolve(fileURLToPath(url));
}

/**
 * A tool's command-line tail: run it when this module is the one that was run,
 * and on a failure print `prefix` and the message and exit non-zero.
 */
export function runMain(url: string, run: () => Promise<void>, prefix = ''): void {
  if (!isMain(url)) return;
  run().catch((error: unknown) => {
    console.error(`${prefix}${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

/** The game's committed art, `public/art/<id>.png`. */
export const ART_DIR = path.join('public', 'art');

/** Committed sprite art is this many times the display box, so it stays crisp when squashed bigger. */
export const SPRITE_SCALE = 2;

/** Rooms and arenas are full-frame backgrounds, at display size; every other kind is a sprite. */
export const isBackgroundKind = (kind: string): boolean => kind === 'room' || kind === 'arena';

/** A PNG as a data URL, for a Playwright page to draw. */
export const pngDataUrl = (png: Buffer): string => `data:image/png;base64,${png.toString('base64')}`;

/** The bytes of a base64 data URL a page handed back (`canvas.toDataURL()`). */
export const fromDataUrl = (url: string): Buffer => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

/** Is there a file or folder at this path? */
export const exists = (f: string): Promise<boolean> =>
  stat(f).then(
    () => true,
    () => false,
  );

/** The generated line list (`npm run voice:lines` writes it). */
export const LINES_FILE = path.join('content', 'voice', 'lines.json');

export const readLines = async () => JSON.parse(await readFile(LINES_FILE, 'utf8')) as LineSpec[];

/**
 * An empty page in this browser, for drawing on a canvas (the art tools). tsx
 * compiles with keepNames, which wraps inner functions in `__name(...)`; the
 * page has no such helper unless we give it one.
 */
export async function blankPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.evaluate('window.__name = (f) => f');
  return page;
}
