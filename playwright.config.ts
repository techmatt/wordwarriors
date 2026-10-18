import { defineConfig, devices } from '@playwright/test';

import { PORT } from './src/port';

// WW_BASE_URL points the suite at an already-running server (e.g. a `vite preview`
// of a build on another port), so a long run is not reloaded by edits to src/.
const BASE_URL = process.env.WW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  outputDir: './test-results',
  // One worker, measured in Seraphina's Secret (2026-08-15): two workers made
  // every test 2.3–2.4x slower, because headless Chromium draws in software and
  // the second browser halves the frame rate of both. Do not re-litigate
  // without a profile.
  fullyParallel: false,
  workers: 1,
  // A trace is bought on the retry only: tracing every run cost 44% of wall clock there.
  retries: 1,
  reporter: [['list']],
  timeout: 150_000,

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: process.env.WW_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
