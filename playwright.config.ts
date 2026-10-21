import { defineConfig, devices } from '@playwright/test';

import { TEST_PORT } from './src/port';

// WW_BASE_URL points the suite at an already-running server (e.g. a `vite preview`
// of a build on another port), so a long run is not reloaded by edits to src/.
// Otherwise the suite starts its own server, never reusing one (whatever already
// answers there may be another checkout's code): on CONDUCTOR_PORT when set (a
// conductor item's port, item 047), else TEST_PORT, never the dev port.
const SERVE_PORT = Number(process.env.CONDUCTOR_PORT) || TEST_PORT;
const BASE_URL = process.env.WW_BASE_URL ?? `http://localhost:${SERVE_PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  outputDir: './test-results',
  // Two workers since item 061 (2026-10-20), on the GPU: the fast lane 87 s against
  // 130 s on one, each test 20-30% slower but two at a time. Three made a Charge
  // round's game time stretch past its limit (28 s to the read against 17 s) and
  // saved nothing (83 s). Software GL (WW_GPU=0) falls back to one: there two
  // workers made every test 2.3-2.4x slower (Seraphina's Secret, 2026-08-15).
  // `--workers=1` for a run that times anything by eye.
  fullyParallel: false,
  workers: process.env.WW_GPU === '0' ? 1 : 2,
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

  // The GPU draws (full Chromium, ANGLE on D3D11) unless WW_GPU=0, which goes back to
  // headless software GL. Measured 2026-10-19 (item 036): one fight style 53 s against
  // 78 s, the fast lane 76 s against 82 s; the battle holds ~56 fps instead of 11-18.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.WW_GPU === '0' ? {} : { channel: 'chromium', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11', '--enable-gpu'] } }),
      },
    },
  ],

  webServer: process.env.WW_BASE_URL
    ? undefined
    : {
        // strictPort (vite.config.ts) makes a busy port fail loudly.
        command: `npx vite --port ${SERVE_PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
