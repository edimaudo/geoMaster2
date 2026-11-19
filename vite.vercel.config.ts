import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'src/client'),
  publicDir: resolve(__dirname, 'src/client/public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@devvit/analytics/client/reddit': resolve(__dirname, 'src/client/vercel/telemetry.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/client/game.html'),
    },
  },
});
