/**
 * Item 150's probe (`castVoice.pw.ts`) against a server already running: `PROBE_URL`, else
 * `http://localhost:$CONDUCTOR_PORT`. It starts none, so the same probe times a fresh
 * `npm run dev`, a warm one, Matt's own or a preview of the build.
 */

import { defineConfig } from '@playwright/test';

import { PERF_PORT } from '../../src/port';
import { gpuProjects } from '../gpu';

export default defineConfig({
  testDir: '.',
  testMatch: 'castVoice.pw.ts',
  outputDir: '../../test-results/castVoice',
  workers: Number(process.env.PROBE_WORKERS ?? 1),
  retries: 0,
  fullyParallel: true,
  reporter: [['list']],
  timeout: 900_000,
  use: { baseURL: process.env.PROBE_URL ?? `http://localhost:${process.env.CONDUCTOR_PORT ?? PERF_PORT}` },
  projects: gpuProjects(),
});
