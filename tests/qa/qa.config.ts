/**
 * Playwright config for the bug-hunt checker (item 039, `tests/qa/*.pw.ts`;
 * the `.pw.ts` name keeps it out of the suite). Its own port, 5195, so it
 * never meets the dev server, a test run or the screenshot tools.
 * The GPU draws, as in the suite (`WW_GPU=0` for software GL). Its server
 * does not watch files (`vite.qa.config.ts`): edits during a sweep wait for the next one.
 */

import { defineConfig } from '@playwright/test';

import { gpuProjects } from '../gpu';

// QA_PORT: a second run beside a sweep (a `QA_LOOK` at one scene) needs its own.
const PORT = Number(process.env.QA_PORT ?? 5195);

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results/qa',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // One scenario is one or more whole episodes.
  timeout: 1_800_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: gpuProjects({ use: { viewport: { width: 1280, height: 720 } }, args: ['--enable-precise-memory-info'] }),
  webServer: {
    command: `npx vite --config tests/qa/vite.qa.config.ts --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
