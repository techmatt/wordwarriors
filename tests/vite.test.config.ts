/**
 * The suite's server (item 079): a production build served by `vite preview`, not the
 * dev server. A page boots from one bundle instead of a few hundred modules transformed
 * on request, and edits to `src/` during a run neither reload the page under test nor
 * mix old and new code. The build leaves `public/` where it is (copying its art and
 * voice, about 190 MB, cost 14 s a build); the preview serves `/art/` and `/voice-gen/`
 * straight from it. `WW_DEV_SERVER=1` runs the suite on the dev server instead
 * (`playwright.config.ts`).
 */

import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

import { defineConfig, mergeConfig, type Plugin } from 'vite';

import base from '../vite.config';

export const TEST_DIST = 'node_modules/.ww-test-dist';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

/** Serve `public/` beside the build, as the dev server does. */
function servePublic(): Plugin {
  const root = resolve('public');
  return {
    name: 'ww-serve-public',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '').split('?')[0]!);
        if (!/^\/(art|voice-gen)\//.test(path)) return next();
        const file = normalize(join(root, path));
        if (!file.startsWith(root)) return next();
        let size: number;
        try {
          const st = statSync(file);
          if (!st.isFile()) return next();
          size = st.size;
        } catch {
          return next();
        }
        res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Content-Length', String(size));
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default mergeConfig(
  base,
  defineConfig({
    build: { outDir: TEST_DIST, emptyOutDir: true, copyPublicDir: false, reportCompressedSize: false },
    plugins: [servePublic()],
  }),
);
