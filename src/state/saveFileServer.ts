/**
 * The save file (item 186), Node side: a vite plugin for the dev server only (`npm run dev`, the `game`
 * target), never the build, the preview or the test servers. Her progress lived only in the browser's
 * localStorage, per origin, and a port move stranded 67 episodes; the dev server now keeps a copy on disk
 * that any origin restores from (src/state/mirror.ts). README, *Operational facts*; docs/storage.md.
 *
 * - `GET /__ww/progress`: the file, or 404.
 * - `PUT /__ww/progress`: the page's latest blob. Refused (409) when the file was saved later than it, or
 *   (item 194) later than the save its copy builds on (`X-WW-Base`): a stale tab on another origin. Before the day's first write, the file as it stood is copied to
 *   `progress-YYYY-MM-DD.json` beside it.
 * - `POST /__ww/progress/aside?origin=…`: a browser's own copy the file is about to replace, kept as
 *   `aside-<origin>-<stamp>.json`, so no copy anywhere is ever dropped unseen.
 *
 * Where: `WW_DATA_DIR`, else `progress/` in the Drive folder behind the `art-originals` junction
 * (C:\Code\gdrive-sync\wordwarriors\progress). On only in the main checkout (a worktree's `.git` is a
 * file), so a worktree's dev server, a test run or a tool never touches her file; `WW_PROGRESS_MIRROR=1`
 * or `=0` overrides that.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';

import type { Plugin } from 'vite';

export const SAVE_URL = '/__ww/progress';
export const SAVE_FILE = 'progress.json';
/** A PUT's header naming the file's stamp the page's copy builds on (`SaveFolder.write`'s `base`), lower case as Node reads it. */
export const BASE_HEADER = 'x-ww-base';

/** Local date as YYYY-MM-DD. */
export function day(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function savedAt(raw: string): number {
  try {
    return (JSON.parse(raw) as { savedAt?: number }).savedAt ?? 0;
  } catch {
    return -1;
  }
}

/** The save file's folder and what it does, apart from HTTP so the unit tests drive it. */
export class SaveFolder {
  constructor(
    readonly dir: string,
    private readonly now: () => number = Date.now,
  ) {}

  get file(): string {
    return join(this.dir, SAVE_FILE);
  }

  read(): string | null {
    try {
      return readFileSync(this.file, 'utf8');
    } catch {
      return null;
    }
  }

  /**
   * Write `raw` unless the file holds a later save; the day's backup first. `base` (item 194) is the file's
   * stamp the page's copy builds on: a file saved since then holds play that page never saw (another tab's), so
   * the page is refused even though its own stamp is newer. Without one, the save's own stamp is compared.
   */
  write(raw: string, base?: number): 'written' | 'stale' | 'bad' {
    const at = savedAt(raw);
    if (at < 0) return 'bad';
    mkdirSync(this.dir, { recursive: true });
    const was = this.read();
    if (was !== null && savedAt(was) > Math.min(at, base ?? at)) return 'stale';
    const backup = join(this.dir, `progress-${day(this.now())}.json`);
    if (was !== null && !existsSync(backup)) copyFileSync(this.file, backup);
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, raw, 'utf8');
    renameSync(tmp, this.file);
    return 'written';
  }

  /** A browser's copy the file replaces, kept beside it. */
  aside(raw: string, origin: string): string {
    mkdirSync(this.dir, { recursive: true });
    const t = new Date(this.now());
    const clock = [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, '0')).join('');
    const name = `aside-${origin.replace(/[^a-z0-9]+/gi, '_')}-${day(this.now())}-${clock}-${t.getMilliseconds()}.json`;
    writeFileSync(join(this.dir, name), raw, 'utf8');
    return name;
  }
}

/** Whether `root` is the main checkout (`.git` a folder), not a linked worktree (`.git` a file). */
function isMainCheckout(root: string): boolean {
  try {
    return statSync(join(root, '.git')).isDirectory();
  } catch {
    return false;
  }
}

/** The save folder this dev server uses, or null when the mirror is off here. */
export function saveDir(root: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const flag = env.WW_PROGRESS_MIRROR;
  if (flag === '0') return null;
  if (flag !== '1' && !isMainCheckout(root)) return null;
  if (env.WW_DATA_DIR) return resolve(env.WW_DATA_DIR);
  try {
    return join(dirname(realpathSync.native(join(root, 'art-originals'))), 'progress');
  } catch {
    return null;
  }
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => parts.push(c));
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
    req.on('error', fail);
  });
}

function send(res: ServerResponse, status: number, text = ''): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(text);
}

export function progressMirror(): Plugin {
  let folder: SaveFolder | null = null;
  return {
    name: 'ww-progress-mirror',
    apply: 'serve',
    configResolved(config) {
      const dir = saveDir(config.root);
      folder = dir ? new SaveFolder(dir) : null;
      if (folder) config.logger.info(`  save file: ${folder.file}`);
    },
    // The page asks only when the mirror is on: a test server's page never fetches.
    transformIndexHtml() {
      return folder ? [{ tag: 'script', children: 'window.__wwSaveFile = true;', injectTo: 'head-prepend' }] : [];
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [path, query] = (req.url ?? '').split('?');
        if (!path?.startsWith(SAVE_URL)) return next();
        if (!folder) return send(res, 404);
        try {
          if (path === SAVE_URL && req.method === 'GET') {
            const raw = folder.read();
            return raw === null ? send(res, 404) : send(res, 200, raw);
          }
          if (path === SAVE_URL && req.method === 'PUT') {
            const header = req.headers[BASE_HEADER];
            const base = typeof header === 'string' && /^\d+$/.test(header) ? Number(header) : undefined;
            const r = folder.write(await body(req), base);
            return send(res, r === 'written' ? 204 : r === 'stale' ? 409 : 400);
          }
          if (path === `${SAVE_URL}/aside` && req.method === 'POST') {
            const origin = new URLSearchParams(query ?? '').get('origin') ?? 'unknown';
            folder.aside(await body(req), origin);
            return send(res, 204);
          }
          return send(res, 405);
        } catch (e) {
          server.config.logger.error(`save file: ${String(e)}`);
          return send(res, 500);
        }
      });
    },
  };
}
