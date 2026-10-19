/**
 * Playwright config for `tests/shots/shots.pw.ts` (screenshots, not tests;
 * the `.pw.ts` name keeps it out of the suite).
 * Its own port, so it never meets the dev server or a test run.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 5194;

export default defineConfig({
  testDir: '.',
  testMatch: 'shots.pw.ts',
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
