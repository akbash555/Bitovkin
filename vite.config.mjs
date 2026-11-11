import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/assets/experience/',
  publicDir: false,
  build: {
    outDir: 'public/experience',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'ui/main.tsx'),
      output: { entryFileNames: 'main.js', chunkFileNames: '[name]-[hash].js' }
    }
  }
});
