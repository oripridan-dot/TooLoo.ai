// @version 2.0.0-alpha.0
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
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true,
      timeout: 5000,
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.timestamp-*.mjs',
        '**/*.timestamp-*.js',
      ],
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      // V2 API on port 4001 - Primary API
      '/api/v2': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      // V2 Socket.IO on port 4001
      '/socket.io': {
        target: 'http://localhost:4001',
        ws: true,
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      // Legacy API fallback - rewrite /api/v1/* to /api/v2/*
      '/api/v1': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v2'),
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@skin': path.resolve(__dirname, 'src/skin'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'zustand', 'framer-motion'],
    exclude: [],
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
