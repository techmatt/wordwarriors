/**
 * The checker's server (item 039): the game's vite config with file watching
 * and hot reload off, so editing `src/` while a long sweep runs neither
 * reloads the page under a scenario nor mixes old and new code in one. A
 * sweep tests the code as it was when its server started.
 */

import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

export default mergeConfig(
  base,
  defineConfig({
    server: { watch: null, hmr: false },
  }),
);
