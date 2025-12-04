// @version 3.3.2
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname),
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Improve build performance
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    // Improve HMR stability
    hmr: {
      overlay: true,
      timeout: 5000,
    },
    // Watch configuration to avoid ENOENT errors on temp files
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        // Ignore Vite/Vitest temporary timestamp files
        '**/*.timestamp-*.mjs',
        '**/*.timestamp-*.js',
      ],
      // Use polling in containers/codespaces for better reliability
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    exclude: [],
  },
  // Improve error overlay
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
