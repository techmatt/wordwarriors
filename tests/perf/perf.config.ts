/**
 * Playwright config for the boot timings (item 065, `tests/perf/*.pw.ts`; the
 * `.pw.ts` name keeps it out of the suite). One worker, so nothing shares the
 * machine with what is being timed. Its server is the checker's (no file
 * watching). Port: `PERF_PORT`, else `CONDUCTOR_PORT`, else 5196.
 *
 *   npx playwright test --config tests/perf/perf.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PERF_PORT ?? process.env.CONDUCTOR_PORT ?? 5196);

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results/perf',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 600_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ...(process.env.WW_GPU === '0' ? {} : { channel: 'chromium', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11', '--enable-gpu'] } }),
      },
    },
  ],
  webServer: {
    command: `npx vite --config tests/qa/vite.qa.config.ts --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
