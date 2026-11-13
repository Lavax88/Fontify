import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  css: {
    lightningcss: {
      targets: {
        chrome: 100 << 16,
        safari: 16 << 16
      }
    }
  },
  build: {
    outDir: 'webroot',
    emptyOutDir: true,
    target: ['chrome90', 'safari16', 'es2022'],
    cssTarget: ['chrome90', 'safari16'],
    cssMinify: 'lightningcss',
    assetsDir: 'assets',
    minify: 'oxc',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
