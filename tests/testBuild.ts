/**
 * The suite's build, skipped when nothing it is built from changed (item 105). Playwright's
 * server runs this, then `vite preview` (`playwright.config.ts`; the bug-hunt checker and
 * the boot timings too, each into its own folder: `tests/qa/qa.config.ts`, item 122, and
 * `tests/perf/perf.config.ts`, item 133). The build's inputs (`src/`, `content/`, the page,
 * the vite configs, the lockfile) are hashed by content into a stamp
 * beside the build; the same hash next run serves the build already there, saving the 4-5 s
 * `vite build` takes (about 0.3 s to check). `WW_REBUILD=1` builds anyway.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TEST_DIST } from './testDist';

const TREES = ['src', 'content'];
const FILES = ['index.html', 'listen.html', 'vite.config.ts', 'tests/vite.test.config.ts', 'package-lock.json', 'tsconfig.json'];
const STAMP = join(TEST_DIST, '.inputs');

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? filesUnder(path) : [path];
  });
}

/** One hash over every input's path and bytes, in a fixed order. */
function inputsHash(): string {
  const hash = createHash('sha1');
  for (const file of [...TREES.flatMap(filesUnder), ...FILES].sort()) {
    hash.update(file.replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

const want = inputsHash();
const have = existsSync(STAMP) && existsSync(join(TEST_DIST, 'index.html')) ? readFileSync(STAMP, 'utf8') : '';
if (have === want && !process.env.WW_REBUILD) {
  console.log(`test build: up to date (${TEST_DIST})`);
} else {
  // vite loads only when it builds: importing it costs about a second.
  const { build } = await import('vite');
  await build({ configFile: 'tests/vite.test.config.ts', logLevel: 'warn' });
  writeFileSync(STAMP, want);
}
