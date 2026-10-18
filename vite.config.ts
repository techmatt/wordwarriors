import { defineConfig } from 'vite';

import { PORT } from './src/port';

export default defineConfig({
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  build: {
    // Phaser is one big chunk; no point warning about it every build.
    chunkSizeWarningLimit: 2000,
  },
});
