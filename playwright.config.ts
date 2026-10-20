import { defineConfig, devices } from '@playwright/test';

import { TEST_PORT } from './src/port';

// WW_BASE_URL points the suite at an already-running server (e.g. a `vite preview`
// of a build on another port), so a long run is not reloaded by edits to src/.
// Otherwise the suite starts its own server on TEST_PORT, never the dev port, and
// never reuses one: whatever already answers there may be another checkout's code.
const BASE_URL = process.env.WW_BASE_URL ?? `http://localhost:${TEST_PORT}`;

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

  // WW_GPU=1 draws with the GPU (full Chromium, ANGLE on D3D11) instead of software GL.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.WW_GPU ? { channel: 'chromium', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11', '--enable-gpu'] } } : {}),
      },
    },
  ],

  webServer: process.env.WW_BASE_URL
    ? undefined
    : {
        // strictPort (vite.config.ts) makes a busy TEST_PORT fail loudly.
        command: `npx vite --port ${TEST_PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
