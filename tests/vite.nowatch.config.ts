/**
 * The dev server with file watching and hot reload off (item 039, the checker's server
 * until item 092 gave it a build, the boot timings' until item 133): the screenshots serve
 * from it (tests/shots/shots.config.ts), and the boot timings and the checker under
 * `PERF_DEV_SERVER=1` / `QA_DEV_SERVER=1`. Editing `src/` while a long run goes neither reloads the page under
 * it nor mixes old and new code in one: a run tests the code as it was when its server
 * started.
 */

import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

export default mergeConfig(
  base,
  defineConfig({
    server: { watch: null, hmr: false },
  }),
);
