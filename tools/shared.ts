/**
 * Helpers every tool shares, art and voice alike, so neither imports the other's
 * modules for them.
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LineSpec } from './voice/types.js';

/** Was this module the one that was run, rather than imported? */
export function isMain(url: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry!) === path.resolve(fileURLToPath(url));
}

/** Is there a file or folder at this path? */
export const exists = (f: string): Promise<boolean> =>
  stat(f).then(
    () => true,
    () => false,
  );

/** The generated line list (`npm run voice:lines` writes it). */
export const LINES_FILE = path.join('content', 'voice', 'lines.json');

export const readLines = async () => JSON.parse(await readFile(LINES_FILE, 'utf8')) as LineSpec[];
