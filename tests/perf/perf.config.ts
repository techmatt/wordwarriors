/**
 * Playwright config for the boot timings (item 065, `tests/perf/*.pw.ts`; the
 * `.pw.ts` name keeps it out of the suite). One worker, so nothing shares the
 * machine with what is being timed. Its server is the dev server without file
 * watching (tests/qa/vite.qa.config.ts, the checker's before it served a build). Port: `PERF_PORT`, else `CONDUCTOR_PORT`, else 5196.
 *
 *   npm run perf
 */

import { defineConfig } from '@playwright/test';

import { gpuProjects } from '../gpu';

const PORT = Number(process.env.PERF_PORT ?? process.env.CONDUCTOR_PORT ?? 5196);

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results/perf',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 600_000,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: gpuProjects(),
  webServer: {
    command: `npx vite --config tests/qa/vite.qa.config.ts --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
