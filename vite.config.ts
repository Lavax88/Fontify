import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'webroot',
    emptyOutDir: true,
    target: 'es2022',
    assetsDir: 'assets',
    minify: 'oxc',
    sourcemap: false
  },
  server: {
    port: 5173,
    host: true
  }
});
