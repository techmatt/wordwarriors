import { defineConfig } from '@playwright/test';

import { TEST_PORT } from './src/port';
import { gpuProjects } from './tests/gpu';

/** The specs that play whole episodes, run first (`projects`, below). */
const LONG_SPECS = ['**/episode.spec.ts', '**/soak.spec.ts', '**/drawn.spec.ts'];

// WW_BASE_URL points the suite at an already-running server (e.g. a `vite preview`
// of a build on another port), so a long run is not reloaded by edits to src/.
// Otherwise the suite starts its own server, never reusing one (whatever already
// answers there may be another checkout's code): on CONDUCTOR_PORT when set (a
// conductor item's port, item 047), else TEST_PORT, never the dev port.
const SERVE_PORT =Number(process.env.CONDUCTOR_PORT) || TEST_PORT;
const BASE_URL = process.env.WW_BASE_URL ?? `http://localhost:${SERVE_PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  outputDir: './test-results',
  // Three workers on the GPU since item 079 (2026-10-21), once the suite served a build:
  // the slow lane 578 s on three against 779 s on two, green (the timed Charge round
  // asserts only on one worker since item 072). Software GL (WW_GPU=0) runs one: there
  // two workers made every test 2.3-2.4x slower (Seraphina's Secret, 2026-08-15).
  // `--workers=1` for a run that times anything by eye. Before the build, item 061
  // (2026-10-20) measured two against one (the fast lane 87 s against 130 s) and three
  // saving nothing (83 s) while a Charge round's game time stretched past its limit.
  // `WW_WORKERS=<n>` overrides the count (item 105: `WW_WORKERS=1` when the machine is short of
  // memory). Item 105 timed `fullyParallel` on three workers: the full run 6.7 minutes against
  // 6.1 by file (the long tests bunch at the end), so tests still spread by file.
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

  // The GPU draws (full Chromium, ANGLE on D3D11) unless WW_GPU=0, which goes back to
  // headless software GL. Measured 2026-10-19 (item 036): one fight style 53 s against
  // 78 s, the fast lane 76 s against 82 s; the battle holds ~56 fps instead of 11-18.
  // Files go to workers in plain name order. Item 081 made the whole episodes a project
  // listed first; once item 083 cut them to under 75 s each, item 085 timed it against name
  // order on the same tree, three workers, no retries: 5.3 and 5.3 minutes against 4.7 and
  // 4.7. `WW_EPISODES_FIRST=1` brings that project back.
  projects: process.env.WW_EPISODES_FIRST
    ? gpuProjects().flatMap((p) => [
        { ...p, name: 'episodes', testMatch: LONG_SPECS },
        { ...p, testIgnore: LONG_SPECS },
      ])
    : gpuProjects(),

  // A build served by `vite preview` (item 079, tests/vite.test.config.ts): pages boot
  // from one bundle, and edits to src/ mid-run reach no page. WW_DEV_SERVER=1 serves
  // the dev server instead (hot reload and all). The build is skipped when its inputs are
  // unchanged (tests/testBuild.ts, item 105). Node runs the tools directly: each `npx` cost
  // about 2 s here, `node` 0.2-0.4 s (item 105).
  webServer: process.env.WW_BASE_URL
    ? undefined
    : {
        // strictPort (vite.config.ts) makes a busy port fail loudly.
        command: process.env.WW_DEV_SERVER
          ? `node node_modules/vite/bin/vite.js --port ${SERVE_PORT}`
          : `node --import tsx tests/testBuild.ts && node node_modules/vite/bin/vite.js preview -c tests/vite.test.config.ts --port ${SERVE_PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
