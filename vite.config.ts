import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'webroot',
    emptyOutDir: true,
    target: 'es2020',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 5173,
    host: true
  }
});
