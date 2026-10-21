/**
 * Playwright config for `tests/shots/*.pw.ts` (screenshots and probes, not tests;
 * the `.pw.ts` name keeps it out of the suite). `npm run shots`.
 * The GPU draws, as in the suite (`WW_GPU=0` for software GL). Its server is the
 * checker's (no file watching, item 072): edits during a run wait for the next one.
 * Port: `SHOTS_PORT`, else 5194, so it never meets the dev server or a test run.
 */

import { defineConfig } from '@playwright/test';

import { gpuProjects } from '../gpu';

const PORT = Number(process.env.SHOTS_PORT ?? 5194);

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results/shots',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 240_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: gpuProjects({ use: { viewport: { width: 1280, height: 720 } } }),
  webServer: {
    command: `npx vite --config tests/qa/vite.qa.config.ts --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
