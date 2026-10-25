import { defineConfig } from 'vite';

import { PORT } from './src/port';

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true,
    // Item 149: the watcher walked scratch/ (138k files) and the Drive junctions, and a fresh
    // dev server took 133 s to reach the title. Scratch now lives outside the repo
    // (tools/scratch.ts); these stay as backstops (a worktree's scratch junction, the art
    // and voice junctions). README, "Start-up".
    watch: { ignored: ['**/scratch/**', '**/art-originals/**', '**/public/voice-gen/**'] },
  },
  preview: { port: PORT, strictPort: true },
  // Only the game's page: with no entries the dependency scan globs every *.html in the tree.
  optimizeDeps: { entries: ['index.html'] },
  build: {
    // Phaser is one big chunk; no point warning about it every build.
    chunkSizeWarningLimit: 2000,
  },
});
