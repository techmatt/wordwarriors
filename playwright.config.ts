import { defineConfig } from '@playwright/test';

import { TEST_PORT } from './src/port';
import { gpuProjects } from './tests/gpu';
import { buildServerCommand, watchedDevServerCommand } from './tests/servers';

/** The specs that play whole episodes, run first (`projects`, below). */
const LONG_SPECS = ['**/episode.spec.ts', '**/soak.spec.ts', '**/drawn.spec.ts'];

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
  // 3 workers on the GPU, 1 on software GL (WW_GPU=0: two made every test 2.3-2.4x
  // slower); the timed Charge round asserts only on one worker. WW_WORKERS overrides
  // (`WW_WORKERS=1` when the machine is short of memory). Tests spread by file
  // (docs/engineering.md, *Browser and tests*).
  fullyParallel: false,
  workers: Number(process.env.WW_WORKERS) || (process.env.WW_GPU === '0' ? 1 : 3),
  // A trace is bought on the retry only: tracing every run cost 44% of wall clock there.
  retries: 1,
  reporter: [['list']],
  timeout: 150_000,

  // The viewport (Desktop Chrome's 1280×720) and the launch flags are the project's (tests/gpu.ts).
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  // GPU unless WW_GPU=0 (tests/gpu.ts); plain name order, WW_EPISODES_FIRST=1 lists the
  // whole-episode specs first (docs/engineering.md, *Browser and tests*).
  projects: process.env.WW_EPISODES_FIRST
    ? gpuProjects().flatMap((p) => [
        { ...p, name: 'episodes', testMatch: LONG_SPECS },
        { ...p, testIgnore: LONG_SPECS },
      ])
    : gpuProjects(),

  // A build served by vite preview (tests/vite.test.config.ts), skipped when unchanged
  // (tests/testBuild.ts): edits to src/ mid-run reach no page. WW_DEV_SERVER=1 for the
  // dev server (tests/servers.ts).
  webServer: process.env.WW_BASE_URL
    ? undefined
    : {
        // strictPort (vite.config.ts) makes a busy port fail loudly.
        command: process.env.WW_DEV_SERVER
          ? watchedDevServerCommand(SERVE_PORT)
          : buildServerCommand(SERVE_PORT),
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
